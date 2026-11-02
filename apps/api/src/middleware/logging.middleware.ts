import type { Middleware } from '../lib/http';

export const loggingMiddleware: Middleware = async (ctx, next) => {
  const startedAt = process.hrtime.bigint();
  const response = await next();
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const fields = {
    method: ctx.method,
    path: ctx.path,
    status: response.status,
    durationMs: Math.round(durationMs * 100) / 100,
    userId: ctx.principal?.userId,
  };
  if (response.status >= 500) {
    ctx.logger.error('request failed', fields);
  } else if (response.status >= 400) {
    ctx.logger.warn('request rejected', fields);
  } else {
    ctx.logger.info('request completed', fields);
  }
  return response;
};
