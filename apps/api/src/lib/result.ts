export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'INTERNAL';

export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function appError(code: ErrorCode, message: string, details?: unknown): AppError {
  return details === undefined ? { code, message } : { code, message, details };
}

export const notFound = (what: string, id: string): AppError =>
  appError('NOT_FOUND', `${what} ${id} not found`);

export const validationError = (details: unknown): AppError =>
  appError('VALIDATION', 'Request validation failed', details);

export const conflict = (message: string): AppError => appError('CONFLICT', message);

export const invalidState = (message: string): AppError => appError('INVALID_STATE', message);

export const unauthorized = (message = 'Authentication required'): AppError =>
  appError('UNAUTHORIZED', message);

export const forbidden = (message = 'Insufficient permissions'): AppError =>
  appError('FORBIDDEN', message);

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? { ok: true, value: fn(result.value) } : result;
}

export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export function statusFor(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION':
      return 422;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'INVALID_STATE':
      return 409;
    case 'INTERNAL':
      return 500;
  }
}
