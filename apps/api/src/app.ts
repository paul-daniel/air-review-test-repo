import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiConfig } from './config';
import { json, readJsonBody, writeResponse, type HttpContext, type HttpMethod, type HttpResponse } from './lib/http';
import { createLogger, type Logger } from './lib/logger';
import { err, notFound, ok } from './lib/result';
import { Router } from './lib/router';
import { createAuthMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { createAuthRouter } from './modules/auth/auth.controller';
import { AuthRepository, seedUsers } from './modules/auth/auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { createCatalogRouter } from './modules/catalog/catalog.controller';
import { CatalogRepository, seedProducts } from './modules/catalog/catalog.repository';
import { CatalogService } from './modules/catalog/catalog.service';
import { createCustomersRouter } from './modules/customers/customers.controller';
import { CustomersRepository, seedCustomers } from './modules/customers/customers.repository';
import { CustomersService } from './modules/customers/customers.service';
import { createOrdersRouter } from './modules/orders/orders.controller';
import { OrdersRepository, seedOrders } from './modules/orders/orders.repository';
import { OrdersService } from './modules/orders/orders.service';
import { createPricingRouter } from './modules/pricing/pricing.controller';
import { PricingRulesRepository } from './modules/pricing/pricing.repository';
import { PricingService } from './modules/pricing/pricing.service';
import { createReturnsRouter } from './modules/returns/returns.controller';
import { ReturnsRepository } from './modules/returns/returns.repository';
import { ReturnsService } from './modules/returns/returns.service';
import { createSupportRouter } from './modules/support/support.controller';
import { SupportRepository, seedTickets } from './modules/support/support.repository';
import { SupportService } from './modules/support/support.service';

const METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export interface AppServices {
  readonly auth: AuthService;
  readonly customers: CustomersService;
  readonly catalog: CatalogService;
  readonly pricing: PricingService;
  readonly orders: OrdersService;
  readonly support: SupportService;
  readonly returns: ReturnsService;
}

export interface App {
  readonly router: Router;
  readonly services: AppServices;
  readonly logger: Logger;
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

/** Composition root: wires repositories, services and routers together. */
export function createApp(config: ApiConfig, logger: Logger = createLogger(config.logLevel)): App {
  const authRepository = new AuthRepository(seedUsers());
  const customersRepository = new CustomersRepository(seedCustomers());
  const catalogRepository = new CatalogRepository(seedProducts());
  const ordersRepository = new OrdersRepository(seedOrders());
  const supportRepository = new SupportRepository(seedTickets());
  const returnsRepository = new ReturnsRepository();

  const auth = new AuthService(authRepository, {
    signingKey: config.tokenSigningKey,
    sessionTtlMinutes: config.sessionTtlMinutes,
  });
  const catalog = new CatalogService(catalogRepository);
  const pricing = new PricingService(new PricingRulesRepository(), {
    findCustomer: (id) => customersRepository.findById(id),
    findProduct: (id) => catalogRepository.findById(id),
    freeShippingThresholdMinor: config.freeShippingThresholdMinor,
    standardShippingMinor: config.standardShippingMinor,
  });
  const orders = new OrdersService(ordersRepository, pricing, catalog);
  const customers = new CustomersService(customersRepository, {
    statsFor: (id) => orders.statsForCustomer(id),
  });
  const support = new SupportService(supportRepository);
  const returns = new ReturnsService(returnsRepository, {
    findOrder: (id) => ordersRepository.findById(id),
    restock: (lines) => {
      for (const line of lines) {
        const product = catalogRepository.findBySku(line.sku);
        if (!product) return err(notFound('Variant', line.sku));
        const adjusted = catalog.adjustStock(product.id, { sku: line.sku, delta: line.quantity, reason: 'return received' });
        if (!adjusted.ok) return adjusted;
      }
      return ok(undefined);
    },
  });

  const router = new Router()
    .use(errorMiddleware)
    .use(loggingMiddleware)
    .use(createAuthMiddleware(auth))
    .get('/health', () => json(200, { status: 'ok', version: '1.4.0' }))
    .mount('/api/auth', createAuthRouter(auth))
    .mount('/api/customers', createCustomersRouter(customers))
    .mount('/api/products', createCatalogRouter(catalog))
    .mount('/api/pricing', createPricingRouter(pricing))
    .mount('/api/orders', createOrdersRouter(orders))
    .mount('/api/support', createSupportRouter(support))
    .mount('/api/returns', createReturnsRouter(returns));

  const services: AppServices = { auth, customers, catalog, pricing, orders, support, returns };

  return {
    router,
    services,
    logger,
    handle: (req, res) => handleRequest(router, config, logger, req, res),
  };
}

async function handleRequest(
  router: Router,
  config: ApiConfig,
  logger: Logger,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const requestId = firstHeader(req.headers['x-request-id']) ?? randomUUID();
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const corsHeaders = {
    'access-control-allow-origin': config.corsOrigin,
    'access-control-allow-headers': 'authorization, content-type, x-request-id',
    'access-control-allow-methods': METHODS.join(', '),
    'x-request-id': requestId,
  };

  if (req.method === 'OPTIONS') {
    writeResponse(res, { status: 204, headers: corsHeaders });
    return;
  }

  const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;
  if (!METHODS.includes(method)) {
    writeResponse(res, { ...json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }), headers: corsHeaders });
    return;
  }

  const ctx: HttpContext = {
    method,
    path: url.pathname,
    params: {},
    query: url.searchParams,
    headers: flattenHeaders(req.headers),
    body: undefined,
    requestId,
    logger: logger.child({ requestId }),
  };

  let response: HttpResponse;
  try {
    const body = method === 'GET' || method === 'DELETE' ? undefined : await readJsonBody(req);
    response = await router.dispatch({ ...ctx, body });
  } catch (error) {
    // readJsonBody can throw before the error middleware is reached.
    response = await errorMiddleware(ctx, () => {
      throw error;
    });
  }
  writeResponse(res, { ...response, headers: { ...corsHeaders, ...(response.headers ?? {}) } });
}

function flattenHeaders(headers: IncomingMessage['headers']): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = firstHeader(value);
  }
  return out;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
