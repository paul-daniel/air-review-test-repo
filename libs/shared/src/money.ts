import { MINOR_UNIT_DIGITS, type CurrencyCode, type Money } from './models/money';

export class CurrencyMismatchError extends Error {
  constructor(left: CurrencyCode, right: CurrencyCode) {
    super(`Cannot combine ${left} with ${right}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  assertInteger(amountMinor, 'amountMinor');
  return { amountMinor, currency };
}

export function zero(currency: CurrencyCode): Money {
  return { amountMinor: 0, currency };
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return { amountMinor: left.amountMinor + right.amountMinor, currency: left.currency };
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return { amountMinor: left.amountMinor - right.amountMinor, currency: left.currency };
}

/** Multiplies by an integer quantity; use {@link multiplyRate} for fractional factors. */
export function multiply(value: Money, quantity: number): Money {
  assertInteger(quantity, 'quantity');
  return { amountMinor: value.amountMinor * quantity, currency: value.currency };
}

/** Multiplies by a decimal factor (e.g. tax rate) and rounds half away from zero. */
export function multiplyRate(value: Money, rate: number): Money {
  if (!Number.isFinite(rate)) {
    throw new RangeError('rate must be a finite number');
  }
  return { amountMinor: roundHalfAwayFromZero(value.amountMinor * rate), currency: value.currency };
}

export function sum(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce((acc, value) => add(acc, value), zero(currency));
}

export function isNegative(value: Money): boolean {
  return value.amountMinor < 0;
}

export function compare(left: Money, right: Money): -1 | 0 | 1 {
  assertSameCurrency(left, right);
  if (left.amountMinor < right.amountMinor) return -1;
  if (left.amountMinor > right.amountMinor) return 1;
  return 0;
}

export function equals(left: Money, right: Money): boolean {
  return left.currency === right.currency && left.amountMinor === right.amountMinor;
}

/** Splits an amount into `parts` shares whose sum is exactly the original amount. */
export function allocate(value: Money, parts: number): Money[] {
  assertInteger(parts, 'parts');
  if (parts <= 0) {
    throw new RangeError('parts must be a positive integer');
  }
  const base = Math.trunc(value.amountMinor / parts);
  const remainder = value.amountMinor - base * parts;
  const sign = remainder < 0 ? -1 : 1;
  return Array.from({ length: parts }, (_, index) => ({
    amountMinor: base + (index < Math.abs(remainder) ? sign : 0),
    currency: value.currency,
  }));
}

export function toMajorUnits(value: Money): number {
  return value.amountMinor / 10 ** MINOR_UNIT_DIGITS[value.currency];
}

export function fromMajorUnits(amount: number, currency: CurrencyCode): Money {
  return {
    amountMinor: roundHalfAwayFromZero(amount * 10 ** MINOR_UNIT_DIGITS[currency]),
    currency,
  };
}

/**
 * Formats a Money value with Intl, e.g. `formatMoney({ amountMinor: 1999, currency: 'EUR' }, 'fr-FR')`
 * returns "19,99 €".
 */
export function formatMoney(value: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: MINOR_UNIT_DIGITS[value.currency],
    maximumFractionDigits: MINOR_UNIT_DIGITS[value.currency],
  }).format(toMajorUnits(value));
}

export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new CurrencyMismatchError(left.currency, right.currency);
  }
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer, received ${value}`);
  }
}
