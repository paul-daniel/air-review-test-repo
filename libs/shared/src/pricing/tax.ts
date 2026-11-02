import { roundHalfAwayFromZero } from '../money';

/** Default VAT rates by ISO country code, in percent. Unknown countries use 0 %. */
export const DEFAULT_TAX_RATES: Readonly<Record<string, number>> = {
  FR: 20,
  DE: 19,
  BE: 21,
  NL: 21,
  ES: 21,
  IT: 22,
  CH: 8.1,
  GB: 20,
  US: 0,
};

export function taxRateFor(countryCode: string): number {
  return DEFAULT_TAX_RATES[countryCode.toUpperCase()] ?? 0;
}

/** Tax to add on top of a net amount (minor units), rounded half away from zero. */
export function taxOnNet(netMinor: number, ratePercent: number): number {
  return roundHalfAwayFromZero((netMinor * ratePercent) / 100);
}

/** Extracts the tax part contained in a gross amount. */
export function taxInGross(grossMinor: number, ratePercent: number): number {
  return grossMinor - roundHalfAwayFromZero(grossMinor / (1 + ratePercent / 100));
}
