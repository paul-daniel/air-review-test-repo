import type { Product, ProductCategory } from '@atlas/shared';

export interface ProductFilter {
  readonly search?: string;
  readonly category?: ProductCategory;
  readonly includeInactive?: boolean;
}

export class CatalogRepository {
  private readonly products = new Map<string, Product>();

  constructor(seed: readonly Product[] = []) {
    for (const product of seed) {
      this.products.set(product.id, product);
    }
  }

  findById(id: string): Product | undefined {
    return this.products.get(id);
  }

  findBySku(sku: string): Product | undefined {
    for (const product of this.products.values()) {
      if (product.sku === sku || product.variants.some((v) => v.sku === sku)) return product;
    }
    return undefined;
  }

  findAll(filter: ProductFilter = {}): Product[] {
    const search = filter.search?.trim().toLowerCase();
    return [...this.products.values()]
      .filter((product) => (filter.includeInactive ? true : product.active))
      .filter((product) => (filter.category ? product.category === filter.category : true))
      .filter((product) =>
        search ? product.name.toLowerCase().includes(search) || product.sku.toLowerCase().includes(search) : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  save(product: Product): Product {
    this.products.set(product.id, product);
    return product;
  }
}

export function seedProducts(): Product[] {
  const at = '2026-01-05T08:00:00.000Z';
  return [
    {
      id: 'prd_01hv3kcp1a',
      sku: 'TEE-ATLAS',
      name: 'Atlas logo tee',
      description: 'Organic cotton t-shirt with the Atlas monogram.',
      category: 'apparel',
      price: { amountMinor: 2500, currency: 'EUR' },
      taxRatePercent: 20,
      variants: [
        { sku: 'TEE-ATLAS-S', label: 'S', stock: 12 },
        { sku: 'TEE-ATLAS-M', label: 'M', stock: 30 },
        { sku: 'TEE-ATLAS-L', label: 'L', stock: 4 },
      ],
      active: true,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prd_01hv3kcq8d',
      sku: 'HOOD-NAVY',
      name: 'Navy hoodie',
      description: 'Heavyweight brushed fleece hoodie.',
      category: 'apparel',
      price: { amountMinor: 6000, currency: 'EUR' },
      taxRatePercent: 20,
      variants: [
        { sku: 'HOOD-NAVY-M', label: 'M', stock: 8 },
        { sku: 'HOOD-NAVY-XL', label: 'XL', stock: 0 },
      ],
      active: true,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prd_01hv3kcrw5',
      sku: 'MUG-01',
      name: 'Enamel mug',
      description: 'Camping-style enamel mug, 350 ml.',
      category: 'home',
      price: { amountMinor: 1400, currency: 'EUR' },
      taxRatePercent: 20,
      variants: [{ sku: 'MUG-01-STD', label: 'Standard', stock: 120 }],
      active: true,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: 'prd_01hv3kcs2k',
      sku: 'CAP-OLD',
      name: 'Legacy cap',
      description: 'Discontinued.',
      category: 'accessories',
      price: { amountMinor: 1900, currency: 'EUR' },
      taxRatePercent: 20,
      variants: [],
      active: false,
      createdAt: at,
      updatedAt: at,
    },
  ];
}
