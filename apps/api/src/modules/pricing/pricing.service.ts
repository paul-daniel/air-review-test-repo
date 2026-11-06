import {
  applyPercentDiscount,
  checkPromotion,
  nowIso,
  promotionOutcome,
  taxOnNet,
  taxRateFor,
  type Customer,
  type OrderTotals,
  type Product,
  type Promotion,
} from '@atlas/shared';
import { appError, err, notFound, ok, type Result } from '../../lib/result';
import type { QuoteLineResultDto, QuoteRequestDto, QuoteResponseDto } from './pricing.dto';
import type { PricingRulesRepository } from './pricing.repository';

export interface PricingDependencies {
  readonly findCustomer: (id: string) => Customer | undefined;
  readonly findProduct: (id: string) => Product | undefined;
  readonly freeShippingThresholdMinor: number;
  readonly standardShippingMinor: number;
  /** Managed promotions (promotions module); the legacy promo table is the fallback. */
  readonly findPromotion?: (code: string) => Promotion | null;
  readonly clock?: () => string;
}

/**
 * Computes order totals. Order of operations is fixed and documented in
 * docs/architecture.md: line discounts (tier) -> promo on subtotal -> shipping -> tax.
 */
export class PricingService {
  private readonly clock: () => string;

  constructor(
    private readonly rules: PricingRulesRepository,
    private readonly deps: PricingDependencies,
  ) {
    this.clock = deps.clock ?? nowIso;
  }

  quote(request: QuoteRequestDto): Result<QuoteResponseDto> {
    const customer = this.deps.findCustomer(request.customerId);
    if (!customer) return err(notFound('Customer', request.customerId));

    const tierPercent = this.rules.tierDiscountPercent(customer.tier);
    const lines: QuoteLineResultDto[] = [];
    for (const line of request.lines) {
      const product = this.deps.findProduct(line.productId);
      if (!product) return err(notFound('Product', line.productId));
      if (!product.active) {
        return err(appError('INVALID_STATE', `Product ${product.sku} is not available for sale`));
      }
      if (product.price.currency !== request.currency) {
        return err(
          appError('VALIDATION', `Product ${product.sku} is priced in ${product.price.currency}, not ${request.currency}`),
        );
      }
      const grossMinor = product.price.amountMinor * line.quantity;
      const netMinor = applyPercentDiscount(grossMinor, tierPercent);
      lines.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: line.quantity,
        unitPriceMinor: product.price.amountMinor,
        discountMinor: grossMinor - netMinor,
        netMinor,
      });
    }

    const subtotalMinor = lines.reduce((sum, line) => sum + line.netMinor, 0);
    const tierDiscountMinor = lines.reduce((sum, line) => sum + line.discountMinor, 0);

    const promo = request.promoCode ? this.resolvePromo(request.promoCode, subtotalMinor, customer.tier) : null;
    if (request.promoCode && !promo) {
      return err(appError('VALIDATION', `Promo code ${request.promoCode} is not applicable`));
    }
    const promoDiscountMinor = promo ? promo.discountMinor : 0;
    const afterPromoMinor = subtotalMinor - promoDiscountMinor;

    const shippingMinor = promo?.freeShipping ? 0 : this.shippingFor(afterPromoMinor);
    const taxMinor = taxOnNet(afterPromoMinor + shippingMinor, taxRateFor(request.shippingCountryCode));

    const totals: OrderTotals = {
      subtotalMinor: subtotalMinor + tierDiscountMinor,
      discountMinor: tierDiscountMinor + promoDiscountMinor,
      shippingMinor,
      taxMinor,
      grandTotalMinor: afterPromoMinor + shippingMinor + taxMinor,
    };

    return ok({
      currency: request.currency,
      customerTier: customer.tier,
      tierDiscountPercent: tierPercent,
      lines,
      totals,
      ...(promo ? { appliedPromo: promo.code } : {}),
    });
  }

  shippingFor(netMinor: number): number {
    return netMinor >= this.deps.freeShippingThresholdMinor ? 0 : this.deps.standardShippingMinor;
  }

  private resolvePromo(
    code: string,
    subtotalMinor: number,
    customerTier: Customer['tier'],
  ): { code: string; discountMinor: number; freeShipping: boolean } | null {
    const promotion = this.deps.findPromotion?.(code) ?? null;
    if (promotion) {
      const check = checkPromotion(promotion, { subtotalMinor, customerTier, nowIso: this.clock() });
      if (!check.applies) return null;
      const outcome = promotionOutcome(subtotalMinor, promotion);
      return { code: promotion.code, ...outcome };
    }
    const rule = this.rules.findPromo(code);
    if (!rule || !rule.active) return null;
    if (rule.validUntil < this.clock()) return null;
    if (subtotalMinor < rule.minSubtotalMinor) return null;
    return { code: rule.code, discountMinor: subtotalMinor - applyPercentDiscount(subtotalMinor, rule.percent), freeShipping: false };
  }
}
