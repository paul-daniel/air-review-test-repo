import type { Address, Customer, CustomerSummary, CustomerTier } from '@atlas/shared';

export type { Address, Customer, CustomerSummary, CustomerTier };

export interface CustomerListFilter {
  readonly search: string;
  readonly tier: CustomerTier | null;
  readonly page: number;
  readonly pageSize: number;
}

export interface CustomerFormValue {
  readonly firstName: string;
  readonly lastName: string;
  readonly tier: CustomerTier;
  readonly marketingOptIn: boolean;
  readonly billingAddress: Address;
}
