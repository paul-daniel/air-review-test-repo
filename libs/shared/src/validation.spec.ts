import { describe, expect, it } from 'vitest';
import {
  collect,
  requireArray,
  requireCountryCode,
  requireEmail,
  requireInteger,
  requireOneOf,
  requirePostalCode,
  requireSku,
  requireString,
} from './validation';

describe('validation', () => {
  it('collect returns valid when every validator passes', () => {
    expect(collect([null, undefined, null])).toEqual({ valid: true });
  });

  it('collect aggregates errors', () => {
    const result = collect([requireString(42, 'name'), requireEmail('nope')]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.map((e) => e.field)).toEqual(['name', 'email']);
    }
  });

  it('validates strings with bounds', () => {
    expect(requireString('ok', 'name')).toBeNull();
    expect(requireString('   ', 'name')?.code).toBe('min_length');
    expect(requireString('a'.repeat(11), 'name', { max: 10 })?.code).toBe('max_length');
  });

  it('validates emails', () => {
    expect(requireEmail('jane.doe@example.com')).toBeNull();
    expect(requireEmail('jane.doe@')?.code).toBe('format');
    expect(requireEmail('')?.code).toBe('min_length');
  });

  it('validates integers with bounds', () => {
    expect(requireInteger(3, 'qty', { min: 1, max: 10 })).toBeNull();
    expect(requireInteger(0, 'qty', { min: 1 })?.code).toBe('min');
    expect(requireInteger(11, 'qty', { max: 10 })?.code).toBe('max');
    expect(requireInteger(1.5, 'qty')?.code).toBe('type');
  });

  it('validates enums and arrays', () => {
    expect(requireOneOf('gold', 'tier', ['gold', 'silver'])).toBeNull();
    expect(requireOneOf('bronze', 'tier', ['gold', 'silver'])?.code).toBe('enum');
    expect(requireArray([], 'lines', { minLength: 1 })?.code).toBe('min_items');
    expect(requireArray([1, 2, 3], 'lines', { maxLength: 2 })?.code).toBe('max_items');
  });

  it('validates address parts and SKUs', () => {
    expect(requirePostalCode('75011')).toBeNull();
    expect(requirePostalCode('SW1A 1AA')).toBeNull();
    expect(requirePostalCode('!!')?.code).toBe('format');
    expect(requireCountryCode('FR')).toBeNull();
    expect(requireCountryCode('fr')?.code).toBe('format');
    expect(requireSku('TSHIRT-BLK-M')).toBeNull();
    expect(requireSku('t shirt')?.code).toBe('format');
  });
});
