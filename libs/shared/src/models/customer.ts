export type CustomerTier = 'standard' | 'silver' | 'gold' | 'platinum';

export const CUSTOMER_TIERS: readonly CustomerTier[] = ['standard', 'silver', 'gold', 'platinum'];

export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
}

export interface Customer {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tier: CustomerTier;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly marketingOptIn: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomerSummary {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly tier: CustomerTier;
  readonly orderCount: number;
  readonly lifetimeValueMinor: number;
}

export function customerFullName(customer: Pick<Customer, 'firstName' | 'lastName'>): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function isCustomerTier(value: unknown): value is CustomerTier {
  return typeof value === 'string' && (CUSTOMER_TIERS as readonly string[]).includes(value);
}
