import { describe, expect, it } from 'vitest';
import {
  add,
  allocate,
  compare,
  CurrencyMismatchError,
  formatMoney,
  fromMajorUnits,
  money,
  multiply,
  multiplyRate,
  subtract,
  sum,
  toMajorUnits,
} from './money';

describe('money', () => {
  it('rejects non-integer minor amounts', () => {
    expect(() => money(19.99, 'EUR')).toThrow(RangeError);
  });

  it('adds and subtracts same-currency values', () => {
    expect(add(money(1000, 'EUR'), money(250, 'EUR'))).toEqual(money(1250, 'EUR'));
    expect(subtract(money(1000, 'EUR'), money(250, 'EUR'))).toEqual(money(750, 'EUR'));
  });

  it('throws on currency mismatch', () => {
    expect(() => add(money(1, 'EUR'), money(1, 'USD'))).toThrow(CurrencyMismatchError);
  });

  it('multiplies by integer quantities only', () => {
    expect(multiply(money(1999, 'EUR'), 3)).toEqual(money(5997, 'EUR'));
    expect(() => multiply(money(1999, 'EUR'), 1.5)).toThrow(RangeError);
  });

  it('multiplies by a rate with half-away-from-zero rounding', () => {
    expect(multiplyRate(money(1005, 'EUR'), 0.2)).toEqual(money(201, 'EUR'));
    expect(multiplyRate(money(-1005, 'EUR'), 0.2)).toEqual(money(-201, 'EUR'));
    expect(multiplyRate(money(125, 'EUR'), 0.5)).toEqual(money(63, 'EUR'));
  });

  it('sums a list', () => {
    expect(sum([money(1, 'GBP'), money(2, 'GBP'), money(3, 'GBP')], 'GBP')).toEqual(money(6, 'GBP'));
    expect(sum([], 'GBP')).toEqual(money(0, 'GBP'));
  });

  it('allocates without losing cents', () => {
    const shares = allocate(money(100, 'EUR'), 3);
    expect(shares.map((s) => s.amountMinor)).toEqual([34, 33, 33]);
    expect(shares.reduce((acc, s) => acc + s.amountMinor, 0)).toBe(100);
  });

  it('converts to and from major units', () => {
    expect(toMajorUnits(money(1999, 'EUR'))).toBe(19.99);
    expect(fromMajorUnits(19.99, 'EUR')).toEqual(money(1999, 'EUR'));
    expect(fromMajorUnits(0.005, 'EUR')).toEqual(money(1, 'EUR'));
  });

  it('compares values', () => {
    expect(compare(money(1, 'EUR'), money(2, 'EUR'))).toBe(-1);
    expect(compare(money(2, 'EUR'), money(2, 'EUR'))).toBe(0);
    expect(compare(money(3, 'EUR'), money(2, 'EUR'))).toBe(1);
  });

  it('formats using Intl', () => {
    expect(formatMoney(money(1999, 'EUR'), 'en-GB')).toBe('€19.99');
    expect(formatMoney(money(1999, 'USD'), 'en-US')).toBe('$19.99');
  });
});
