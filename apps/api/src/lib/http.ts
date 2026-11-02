import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from './logger';
import { statusFor, type AppError, type Result } from './result';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Principal {
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly string[];
}

export interface HttpContext {
  readonly method: HttpMethod;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: unknown;
  readonly requestId: string;
  readonly logger: Logger;
  principal?: Principal;
}

export interface HttpResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

export type Handler = (ctx: HttpContext) => Promise<HttpResponse> | HttpResponse;
export type Next = () => Promise<HttpResponse>;
export type Middleware = (ctx: HttpContext, next: Next) => Promise<HttpResponse>;

const MAX_BODY_BYTES = 1024 * 1024;

export function json(status: number, body: unknown): HttpResponse {
  return { status, body };
}

export const okJson = (body: unknown): HttpResponse => json(200, body);
export const created = (body: unknown): HttpResponse => json(201, body);
export const noContent = (): HttpResponse => ({ status: 204 });

export function fromResult<T>(
  result: Result<T, AppError>,
  successStatus = 200,
): HttpResponse {
  if (result.ok) {
    return successStatus === 204 ? noContent() : json(successStatus, result.value);
  }
  return errorResponse(result.error);
}

export function errorResponse(error: AppError): HttpResponse {
  return json(statusFor(error.code), {
    error: { code: error.code, message: error.message, details: error.details ?? null },
  });
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.trim() === '') return undefined;
  return JSON.parse(text);
}

export function writeResponse(res: ServerResponse, response: HttpResponse): void {
  const headers: Record<string, string> = { ...(response.headers ?? {}) };
  if (response.body === undefined) {
    res.writeHead(response.status, headers);
    res.end();
    return;
  }
  const payload = JSON.stringify(response.body);
  headers['content-type'] = 'application/json; charset=utf-8';
  headers['content-length'] = String(Buffer.byteLength(payload));
  res.writeHead(response.status, headers);
  res.end(payload);
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super(`Request body exceeds ${MAX_BODY_BYTES} bytes`);
    this.name = 'PayloadTooLargeError';
  }
}

export function intQuery(query: URLSearchParams, name: string, fallback: number): number {
  const raw = query.get(name);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
