# Scenario 07 — promotions: a real feature with seven planted problems

Branch: `scenario/07-promotions` (from `main`), 51 files, about 1,800 added lines across
`libs/shared`, `apps/api` and `apps/web`.

## Purpose

The other scenarios are small. This one is the size of a real feature pull request: a
promotions module (percentage, fixed-amount and free-shipping campaign codes with tiers,
dates and usage limits) with shared models and rules, an API module wired into pricing, a web
list and editor, a promo code preview in the order editor, a dashboard KPI and the three
translation files. Seven problems are planted in different domains, each in its own file, so
every finding lands on a different line. It checks the heavy tier end to end: cost, duration,
and which kinds of defect the tool catches on a large diff.

## Planted problems

| # | Domain | File | Problem | How it should be caught |
| - | ------ | ---- | ------- | ----------------------- |
| a | security | `apps/api/src/config.ts` | `marketingFeedSecret = 'mkf_live_…'` committed to source | `security.secret-in-code` (deterministic, BLOCKER) |
| b | API security | `apps/api/src/modules/promotions/promotions.controller.ts` | `PATCH /:id` has no `requireRole` and passes `ctx.body` to the service without `validateUpdatePromotion` (every sibling route validates and guards) | model, CRITICAL/MAJOR |
| c | Angular convention | `apps/web/src/app/features/orders/order-promotion.component.ts` | one-off component that injects `PromotionsService` and `NotificationService` and renders a template, inside a feature that uses container/presenter pairs | `angular.container-presenter` (deterministic, MAJOR) |
| d | Angular lifecycle | `apps/web/src/app/features/promotions/promotion-list.container.ts` | `this.route.queryParamMap.subscribe(...)` without `takeUntilDestroyed` | `angular.subscription-lifecycle` (deterministic, MAJOR) |
| e | complex logic / money | `libs/shared/src/pricing/promotion.ts` | `promotionOutcome` returns `subtotalMinor * value / 100` for percentages: a non-integer number of minor units (3333 × 15 / 100 = 499.95) instead of `percentDiscountAmount` / `roundHalfAwayFromZero`; the spec only uses round numbers | model, CRITICAL (money is an integer of minor units, see docs/architecture.md) |
| f | state management | `apps/web/src/app/features/promotions/promotions.store.ts` | the store exposes `items` and `total` as writable `signal()`s and `upsert` mutates the array in place (`list[index] = …`, `list.unshift`), against the `OrdersStore` reference (read-only signals, `update` with a new array) | model, MAJOR (repository convention) |
| g | simple UI / i18n | `apps/web/src/app/features/promotions/promotion-list.presenter.html` | hard-coded user-visible sentence "No promotions match your filters…" next to translated strings; the key `promotions.list.empty` exists in the three dictionaries | model, MAJOR (no hard-coded string in templates) |

The component of (c) also subscribes inside an `effect()` without `takeUntilDestroyed`, which
the lifecycle rule reports as well.

## Expected air-review behaviour

- **Routing:** `heavy` by the thresholds (51 files, ~1,800 lines, 3 modules); the strong
  reviewer model runs once on the whole diff, the verifier once.
- **Deterministic findings (no model needed):** (a), (c), (d), plus the `effect()` subscription of (c).
- **Model findings:** (b), (e), (f), (g).
- **Vote:** Waiting for author (-5); build validation fails with exit code 10.
- **Cost:** in the order of $0.15–0.25 per full review with gpt-5-codex (46k input tokens
  observed); a re-push reviews only the delta.

## Observed on 2026-11-06 (local run, gpt-5-codex heavy tier, keyless Foundry)

Verdict: changes requested. Tier heavy, 2 model calls, 85 s, $0.17 (46,715 in / 12,007 out).
Seven findings open:

| Planted | Found | Finding |
| ------- | ----- | ------- |
| a | yes | BLOCKER `security.secret-in-code` on `config.ts:23` |
| b | yes | CRITICAL "PATCH /promotions/:id lacks a role guard" and MAJOR "Promotion updates skip validation" (two findings for the one planted route) |
| c | yes | MAJOR `angular.container-presenter` on `order-promotion.component.ts` |
| d | yes | MAJOR `angular.subscription-lifecycle` on `promotion-list.container.ts:53` |
| (c) effect | yes, twice | MAJOR on lines 48 and 54 of the component: one subscription, two anchors. Fixed in air-review the same day (commit 96686d0): one finding from now on |
| e | **no** | the non-integer money amount was not reported |
| f | **no** | the writable signals and in-place mutation were not reported |
| g | **no** | the hard-coded template string was not reported |

The three misses are the ones that need the repository's own rules (integer money, store
conventions, no hard-coded strings): they are written in `docs/architecture.md`, which the
reviewer does not read today. They are the measuring stick for the "identity card" feature
(a team-written guidelines file injected into the review) planned in air-review.

## Opening the PR

```bash
node scripts/push-scenario-branches.mjs
```

Title suggestion: `feat(promotions): managed campaign codes across shared, api and web`.
