/**
 * Minimal, dependency-free validation helpers. Each validator returns a list of
 * field errors so that callers can aggregate them into a single 422 response.
 */
export interface FieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly errors: readonly FieldError[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const SKU_PATTERN = /^[A-Z0-9]{2,8}(-[A-Z0-9]{1,8}){0,3}$/;

export function fieldError(field: string, code: string, message: string): FieldError {
  return { field, code, message };
}

export function collect(errors: readonly (FieldError | null | undefined)[]): ValidationResult {
  const present = errors.filter((e): e is FieldError => e != null);
  return present.length === 0 ? { valid: true } : { valid: false, errors: present };
}

export function requireString(
  value: unknown,
  field: string,
  options: { readonly min?: number; readonly max?: number } = {},
): FieldError | null {
  if (typeof value !== 'string') {
    return fieldError(field, 'type', `${field} must be a string`);
  }
  const trimmed = value.trim();
  const min = options.min ?? 1;
  if (trimmed.length < min) {
    return fieldError(field, 'min_length', `${field} must have at least ${min} characters`);
  }
  if (options.max !== undefined && trimmed.length > options.max) {
    return fieldError(field, 'max_length', `${field} must have at most ${options.max} characters`);
  }
  return null;
}

export function optionalString(value: unknown, field: string, max = 500): FieldError | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return requireString(value, field, { min: 0, max });
}

export function requireEmail(value: unknown, field = 'email'): FieldError | null {
  const base = requireString(value, field, { max: 254 });
  if (base) return base;
  return EMAIL_PATTERN.test(value as string)
    ? null
    : fieldError(field, 'format', `${field} must be a valid email address`);
}

export function requireInteger(
  value: unknown,
  field: string,
  options: { readonly min?: number; readonly max?: number } = {},
): FieldError | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return fieldError(field, 'type', `${field} must be an integer`);
  }
  if (options.min !== undefined && value < options.min) {
    return fieldError(field, 'min', `${field} must be >= ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    return fieldError(field, 'max', `${field} must be <= ${options.max}`);
  }
  return null;
}

export function requireBoolean(value: unknown, field: string): FieldError | null {
  return typeof value === 'boolean' ? null : fieldError(field, 'type', `${field} must be a boolean`);
}

export function requireOneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): FieldError | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? null
    : fieldError(field, 'enum', `${field} must be one of: ${allowed.join(', ')}`);
}

export function requireArray(
  value: unknown,
  field: string,
  options: { readonly minLength?: number; readonly maxLength?: number } = {},
): FieldError | null {
  if (!Array.isArray(value)) {
    return fieldError(field, 'type', `${field} must be an array`);
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    return fieldError(field, 'min_items', `${field} must contain at least ${options.minLength} items`);
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return fieldError(field, 'max_items', `${field} must contain at most ${options.maxLength} items`);
  }
  return null;
}

export function requirePostalCode(value: unknown, field = 'postalCode'): FieldError | null {
  const base = requireString(value, field, { max: 10 });
  if (base) return base;
  return POSTAL_CODE_PATTERN.test((value as string).trim())
    ? null
    : fieldError(field, 'format', `${field} is not a valid postal code`);
}

export function requireCountryCode(value: unknown, field = 'countryCode'): FieldError | null {
  return typeof value === 'string' && COUNTRY_CODE_PATTERN.test(value)
    ? null
    : fieldError(field, 'format', `${field} must be an ISO 3166-1 alpha-2 code`);
}

export function requireSku(value: unknown, field = 'sku'): FieldError | null {
  return typeof value === 'string' && SKU_PATTERN.test(value)
    ? null
    : fieldError(field, 'format', `${field} must look like ABC-123 (upper-case, dashes)`);
}

export function requireIsoDate(value: unknown, field: string): FieldError | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return fieldError(field, 'format', `${field} must be an ISO 8601 date`);
  }
  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
