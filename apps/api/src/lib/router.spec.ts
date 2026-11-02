import { describe, expect, it } from 'vitest';
import type { HttpContext, Middleware } from './http';
import { json } from './http';
import { noopLogger } from './logger';
import { Router } from './router';

function ctx(method: HttpContext['method'], path: string): HttpContext {
  return {
    method,
    path,
    params: {},
    query: new URLSearchParams(),
    headers: {},
    body: undefined,
    requestId: 'req_test',
    logger: noopLogger,
  };
}

describe('Router', () => {
  it('matches static and parameterised routes', async () => {
    const router = new Router()
      .get('/health', () => json(200, { ok: true }))
      .get('/customers/:id', (c) => json(200, { id: c.params['id'] }));

    expect((await router.dispatch(ctx('GET', '/health'))).body).toEqual({ ok: true });
    expect((await router.dispatch(ctx('GET', '/customers/cus_1'))).body).toEqual({ id: 'cus_1' });
    expect((await router.dispatch(ctx('GET', '/customers/cus_1/'))).status).toBe(200);
  });

  it('returns 404 for unknown paths and 405 for wrong methods', async () => {
    const router = new Router().get('/orders', () => json(200, []));
    expect((await router.dispatch(ctx('GET', '/nope'))).status).toBe(404);
    expect((await router.dispatch(ctx('POST', '/orders'))).status).toBe(405);
  });

  it('runs global then route middleware in order', async () => {
    const calls: string[] = [];
    const tag =
      (name: string): Middleware =>
      async (_c, next) => {
        calls.push(`before:${name}`);
        const res = await next();
        calls.push(`after:${name}`);
        return res;
      };
    const router = new Router().use(tag('global')).get('/x', () => json(200, null), tag('route'));
    await router.dispatch(ctx('GET', '/x'));
    expect(calls).toEqual(['before:global', 'before:route', 'after:route', 'after:global']);
  });

  it('mounts child routers under a prefix', async () => {
    const child = new Router().get('/:id', (c) => json(200, c.params['id']));
    const router = new Router().mount('/api/products', child);
    expect((await router.dispatch(ctx('GET', '/api/products/prd_9'))).body).toBe('prd_9');
  });
});
