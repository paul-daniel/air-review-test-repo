import type { Address, CustomerTier } from '@atlas/shared';

export interface CreateCustomerDto {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly tier?: CustomerTier;
  readonly billingAddress: Address;
  readonly shippingAddress?: Address;
  readonly marketingOptIn?: boolean;
}

export interface UpdateCustomerDto {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly tier?: CustomerTier;
  readonly billingAddress?: Address;
  readonly shippingAddress?: Address | null;
  readonly marketingOptIn?: boolean;
}

export interface CustomerListQuery {
  readonly search?: string;
  readonly tier?: CustomerTier;
  readonly page: number;
  readonly pageSize: number;
}

export interface PagedResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
