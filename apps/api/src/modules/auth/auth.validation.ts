import { collect, isRecord, requireEmail, requireString, type ValidationResult } from '@atlas/shared';
import type { LoginRequestDto } from './auth.dto';

export function validateLoginRequest(
  body: unknown,
): ValidationResult & { readonly value?: LoginRequestDto } {
  if (!isRecord(body)) {
    return { valid: false, errors: [{ field: 'body', code: 'type', message: 'Body must be an object' }] };
  }
  const result = collect([
    requireEmail(body['email']),
    requireString(body['password'], 'password', { min: 8, max: 128 }),
  ]);
  if (!result.valid) return result;
  return {
    valid: true,
    value: { email: (body['email'] as string).trim().toLowerCase(), password: body['password'] as string },
  };
}
