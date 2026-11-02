import { json, PayloadTooLargeError, type Middleware } from '../lib/http';

/**
 * Last line of defence: converts thrown exceptions into a JSON 500 (or 413)
 * without leaking stack traces to the client.
 */
export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return json(413, { error: { code: 'PAYLOAD_TOO_LARGE', message: error.message } });
    }
    if (error instanceof SyntaxError) {
      return json(400, { error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    }
    ctx.logger.error('unhandled exception', {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return json(500, {
      error: { code: 'INTERNAL', message: 'Unexpected error', requestId: ctx.requestId },
    });
  }
};
