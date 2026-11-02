import type { Handler, HttpContext, HttpMethod, HttpResponse, Middleware } from './http';
import { json } from './http';

interface Route {
  readonly method: HttpMethod;
  readonly pattern: RegExp;
  readonly paramNames: readonly string[];
  readonly handler: Handler;
  readonly middleware: readonly Middleware[];
}

export interface RouteMatch {
  readonly route: Route;
  readonly params: Record<string, string>;
}

/**
 * Minimal path router: supports `:param` segments, per-route middleware and a
 * global middleware chain. Deliberately tiny; we do not need a framework.
 */
export class Router {
  private readonly routes: Route[] = [];
  private readonly globalMiddleware: Middleware[] = [];

  use(middleware: Middleware): this {
    this.globalMiddleware.push(middleware);
    return this;
  }

  get(path: string, handler: Handler, ...middleware: Middleware[]): this {
    return this.add('GET', path, handler, middleware);
  }

  post(path: string, handler: Handler, ...middleware: Middleware[]): this {
    return this.add('POST', path, handler, middleware);
  }

  put(path: string, handler: Handler, ...middleware: Middleware[]): this {
    return this.add('PUT', path, handler, middleware);
  }

  patch(path: string, handler: Handler, ...middleware: Middleware[]): this {
    return this.add('PATCH', path, handler, middleware);
  }

  delete(path: string, handler: Handler, ...middleware: Middleware[]): this {
    return this.add('DELETE', path, handler, middleware);
  }

  /** Mounts a child router's routes under a prefix. */
  mount(prefix: string, child: Router): this {
    for (const route of child.routes) {
      this.routes.push({
        ...route,
        pattern: new RegExp(`^${escapePrefix(prefix)}${route.pattern.source.slice(1)}`),
      });
    }
    return this;
  }

  match(method: HttpMethod, path: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const result = route.pattern.exec(path);
      if (!result) continue;
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(result[index + 1] ?? '');
      });
      return { route, params };
    }
    return null;
  }

  /** Whether any route exists for the path regardless of method (used for 405s). */
  hasPath(path: string): boolean {
    return this.routes.some((route) => route.pattern.test(path));
  }

  async dispatch(ctx: HttpContext): Promise<HttpResponse> {
    const match = this.match(ctx.method, ctx.path);
    const handler: Handler = match
      ? match.route.handler
      : () =>
          this.hasPath(ctx.path)
            ? json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
            : json(404, { error: { code: 'NOT_FOUND', message: `No route for ${ctx.path}` } });
    const chain = [...this.globalMiddleware, ...(match?.route.middleware ?? [])];
    const enriched: HttpContext = match ? { ...ctx, params: match.params } : ctx;
    return runChain(chain, handler, enriched);
  }

  private add(method: HttpMethod, path: string, handler: Handler, middleware: Middleware[]): this {
    const paramNames: string[] = [];
    // '/' means "the mount point itself"; an empty source keeps mounted patterns clean.
    const source = (path === '/' ? '' : path)
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return escapeSegment(segment);
      })
      .join('/');
    this.routes.push({
      method,
      pattern: new RegExp(`^${source}/?$`),
      paramNames,
      handler,
      middleware,
    });
    return this;
  }
}

export function runChain(
  middleware: readonly Middleware[],
  handler: Handler,
  ctx: HttpContext,
): Promise<HttpResponse> {
  let index = -1;
  const step = async (i: number): Promise<HttpResponse> => {
    if (i <= index) {
      throw new Error('next() called multiple times');
    }
    index = i;
    const current = middleware[i];
    if (!current) {
      return handler(ctx);
    }
    return current(ctx, () => step(i + 1));
  };
  return step(0);
}

function escapeSegment(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapePrefix(prefix: string): string {
  return prefix.replace(/\/$/, '').split('/').map(escapeSegment).join('/');
}
