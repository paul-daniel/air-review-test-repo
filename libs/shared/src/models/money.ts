/**
 * ISO 4217 currency codes supported by the shop. Prices are always stored and
 * transported in *minor units* (cents) as integers; floating point money is a bug.
 */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF';

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['EUR', 'USD', 'GBP', 'CHF'];

/** Number of minor-unit digits per currency (all supported currencies use 2). */
export const MINOR_UNIT_DIGITS: Readonly<Record<CurrencyCode, number>> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
};

export interface Money {
  /** Integer amount in minor units, e.g. 1999 for EUR 19.99. */
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
