import { createId, nowIso, type Product, type ProductVariant } from '@atlas/shared';
import { conflict, err, invalidState, notFound, ok, type Result } from '../../lib/result';
import type { PagedResponse } from '../customers/customers.dto';
import type { CreateProductDto, ProductListQuery, ProductVariantDto, StockAdjustmentDto, UpdateProductDto } from './catalog.dto';
import type { CatalogRepository } from './catalog.repository';

export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly clock: () => string = nowIso,
  ) {}

  list(query: ProductListQuery): Result<PagedResponse<Product>> {
    const all = this.repository.findAll({
      includeInactive: query.includeInactive,
      ...(query.search !== undefined ? { search: query.search } : {}),
      ...(query.category !== undefined ? { category: query.category } : {}),
    });
    const start = (query.page - 1) * query.pageSize;
    return ok({
      items: all.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: all.length,
    });
  }

  getById(id: string): Result<Product> {
    const product = this.repository.findById(id);
    return product ? ok(product) : err(notFound('Product', id));
  }

  create(dto: CreateProductDto): Result<Product> {
    if (this.repository.findBySku(dto.sku)) {
      return err(conflict(`SKU ${dto.sku} already exists`));
    }
    const now = this.clock();
    const product: Product = {
      id: createId('prd'),
      sku: dto.sku,
      name: dto.name,
      description: dto.description ?? '',
      category: dto.category,
      price: { amountMinor: dto.priceMinor, currency: dto.currency },
      taxRatePercent: dto.taxRatePercent,
      variants: (dto.variants ?? []).map((v) => this.toVariant(v, dto.currency)),
      active: dto.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    return ok(this.repository.save(product));
  }

  update(id: string, dto: UpdateProductDto): Result<Product> {
    const existing = this.repository.findById(id);
    if (!existing) return err(notFound('Product', id));
    const updated: Product = {
      ...existing,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      category: dto.category ?? existing.category,
      price: dto.priceMinor !== undefined ? { ...existing.price, amountMinor: dto.priceMinor } : existing.price,
      taxRatePercent: dto.taxRatePercent ?? existing.taxRatePercent,
      variants: dto.variants ? dto.variants.map((v) => this.toVariant(v, existing.price.currency)) : existing.variants,
      active: dto.active ?? existing.active,
      updatedAt: this.clock(),
    };
    return ok(this.repository.save(updated));
  }

  adjustStock(productId: string, dto: StockAdjustmentDto): Result<Product> {
    const product = this.repository.findById(productId);
    if (!product) return err(notFound('Product', productId));
    const variant = product.variants.find((v) => v.sku === dto.sku);
    if (!variant) return err(notFound('Variant', dto.sku));
    const nextStock = variant.stock + dto.delta;
    if (nextStock < 0) {
      return err(invalidState(`Stock for ${dto.sku} cannot go below zero (current ${variant.stock}, delta ${dto.delta})`));
    }
    const updated: Product = {
      ...product,
      variants: product.variants.map((v) => (v.sku === dto.sku ? { ...v, stock: nextStock } : v)),
      updatedAt: this.clock(),
    };
    return ok(this.repository.save(updated));
  }

  /** Reserves stock for an order; fails atomically if any line is short. */
  reserve(lines: readonly { readonly sku: string; readonly quantity: number }[]): Result<void> {
    for (const line of lines) {
      const product = this.repository.findBySku(line.sku);
      const variant = product?.variants.find((v) => v.sku === line.sku);
      if (!product || !variant) return err(notFound('Variant', line.sku));
      if (variant.stock < line.quantity) {
        return err(invalidState(`Insufficient stock for ${line.sku}: ${variant.stock} < ${line.quantity}`));
      }
    }
    for (const line of lines) {
      const product = this.repository.findBySku(line.sku);
      if (!product) continue;
      this.repository.save({
        ...product,
        variants: product.variants.map((v) => (v.sku === line.sku ? { ...v, stock: v.stock - line.quantity } : v)),
        updatedAt: this.clock(),
      });
    }
    return ok(undefined);
  }

  private toVariant(dto: ProductVariantDto, currency: Product['price']['currency']): ProductVariant {
    return {
      sku: dto.sku,
      label: dto.label,
      stock: dto.stock,
      ...(dto.priceOverrideMinor !== undefined ? { priceOverride: { amountMinor: dto.priceOverrideMinor, currency } } : {}),
    };
  }
}
