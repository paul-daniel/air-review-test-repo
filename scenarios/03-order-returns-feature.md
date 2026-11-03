# Scenario 03 — large cross-module feature (order returns)

Branch: `scenario/03-order-returns-feature` (from `main`)

## Purpose

A realistic feature PR that touches all three top-level modules and adds a new screen:
customers can return delivered order lines, support agents approve or reject the request, and
the refund is computed from the original line prices and discounts. The code follows every
repository convention and plants no bug. Checks that air-review routes a big diff to the heavy
tier, reviews it as a whole (routes, store, i18n, docs) and still approves.

## Files touched

**libs/shared**

- `src/models/return.ts` — `Return`, `ReturnLine`, `ReturnStatus`, `ReturnReason`, transitions
- `src/models/index.ts` — barrel export
- `src/returns/return-validation.ts`, `src/returns/return-validation.spec.ts`, `src/returns/index.ts`
- `src/pricing/refund.ts`, `src/pricing/refund.spec.ts`, `src/pricing/index.ts` — refund calculation
- `src/index.ts` — barrel export

**apps/api**

- `src/modules/returns/returns.dto.ts`, `returns.validation.ts`, `returns.repository.ts`,
  `returns.service.ts`, `returns.controller.ts`, `returns.service.spec.ts`
- `src/app.ts` — module wiring and `/api/returns` mount

**apps/web**

- `src/app/features/returns/return.models.ts`, `returns.service.ts`, `returns.store.ts`,
  `returns.store.spec.ts`, `returns.routes.ts`
- `src/app/features/returns/return-list.container.ts`, `return-list.presenter.ts`, `return-list.presenter.html`
- `src/app/features/returns/return-request.container.ts`, `return-request.presenter.ts`, `return-request.presenter.html`
- `src/app/app.routes.ts`, `src/app/app.component.ts` — route and navigation entry
- `src/assets/i18n/en.json`, `fr.json`, `de.json` — `returns.*` keys in all three

**docs**

- `docs/architecture.md` — "Returns" section

About 30 files, more than 1,000 added lines.

## Opening the PR

```bash
git switch scenario/03-order-returns-feature
git push origin scenario/03-order-returns-feature
```

Title suggestion: `feat(returns): order returns across shared, api and web`.

## Expected air-review behaviour

- **Routing:** `heavy`. Reasons: ≥ 10 files, ≥ 400 changed lines, 3 top-level modules
  (`libs/shared`, `apps/api`, `apps/web`). The strong model is named in the summary.
- **Deterministic rules:**
  - every new `returns.*` key exists in en/fr/de (checked by eye; air-review has no i18n parity rule yet).
  - `angular.container-presenter` passes: both new screens are container + presenter pairs.
  - `angular.subscription-lifecycle` passes: every `subscribe(` in the containers uses
    `takeUntilDestroyed(this.destroyRef)`.
  - No secret.
- **Model findings:** no BLOCKER / CRITICAL / MAJOR. MINOR or INFO notes are acceptable
  (for instance: suggest an index on `orderId` once the repository is backed by a database,
  or note that the refund rounding is documented in the spec).
- **Vote:** Approved (10) by the approve step if the strong model reports nothing real. The live run of 3 November reported two findings at confidence 0.70 (restock before status validation, unstable return references); with the current gate (MINOR and above at ≥ 0.6 blocks) they mean Waiting for author (-5) until a human fixes or dismisses them.
- **Build validation:** exit code 0.
- The summary must list the modules reviewed and should mention the refund calculation and the
  state machine as the risk areas it looked at.
