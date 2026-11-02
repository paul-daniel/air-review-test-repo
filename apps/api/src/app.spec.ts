import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { ApiConfig } from './config';
import type { HttpContext } from './lib/http';
import { noopLogger } from './lib/logger';

const SEED_CREDENTIAL = 'local-dev-only';

const config: ApiConfig = {
  port: 0,
  host: '127.0.0.1',
  logLevel: 'error',
  corsOrigin: '*',
  sessionTtlMinutes: 30,
  tokenSigningKey: 'spec-key',
  paymentWebhookSecret: process.env['PAYMENT_WEBHOOK_SECRET'] ?? 'spec-webhook',
  defaultCurrency: 'EUR',
  freeShippingThresholdMinor: 7500,
  standardShippingMinor: 590,
};

function request(partial: Partial<HttpContext> & Pick<HttpContext, 'method' | 'path'>): HttpContext {
  return {
    params: {},
    query: new URLSearchParams(),
    headers: {},
    body: undefined,
    requestId: 'req_spec',
    logger: noopLogger,
    ...partial,
  };
}

describe('createApp', () => {
  it('exposes a public health endpoint', async () => {
    const app = createApp(config, noopLogger);
    const response = await app.router.dispatch(request({ method: 'GET', path: '/health' }));
    expect(response.status).toBe(200);
  });

  it('protects module routes behind authentication', async () => {
    const app = createApp(config, noopLogger);
    const anonymous = await app.router.dispatch(request({ method: 'GET', path: '/api/orders' }));
    expect(anonymous.status).toBe(401);

    const login = await app.router.dispatch(
      request({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'ops@atlas-shop.local', password: SEED_CREDENTIAL },
      }),
    );
    expect(login.status).toBe(200);
    const token = (login.body as { token: string }).token;
    const orders = await app.router.dispatch(
      request({ method: 'GET', path: '/api/orders', headers: { authorization: `Bearer ${token}` } }),
    );
    expect(orders.status).toBe(200);
    expect((orders.body as { total: number }).total).toBe(2);
  });

  it('enforces role guards per route', async () => {
    const app = createApp(config, noopLogger);
    const login = await app.router.dispatch(
      request({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'support@atlas-shop.local', password: SEED_CREDENTIAL },
      }),
    );
    const token = (login.body as { token: string }).token;
    const forbidden = await app.router.dispatch(
      request({
        method: 'POST',
        path: '/api/products',
        headers: { authorization: `Bearer ${token}` },
        body: {},
      }),
    );
    expect(forbidden.status).toBe(403);
  });
});
