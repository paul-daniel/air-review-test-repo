import { describe, expect, it } from 'vitest';
import { taxInGross, taxOnNet, taxRateFor } from './tax';

describe('tax', () => {
  it('resolves default rates case-insensitively', () => {
    expect(taxRateFor('fr')).toBe(20);
    expect(taxRateFor('DE')).toBe(19);
    expect(taxRateFor('ZZ')).toBe(0);
  });

  it('computes tax on net amounts', () => {
    expect(taxOnNet(10000, 20)).toBe(2000);
    expect(taxOnNet(1999, 19)).toBe(380);
  });

  it('extracts tax from gross amounts', () => {
    expect(taxInGross(12000, 20)).toBe(2000);
    expect(taxInGross(1999, 19)).toBe(319);
  });
});
