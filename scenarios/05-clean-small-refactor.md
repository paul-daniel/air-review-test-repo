# Scenario 05 — clean small refactor (shared order reference helper)

Branch: `scenario/05-clean-small-refactor` (from `main`)

## Purpose

The string `ORD-<year>-<number padded to 6>` was built inline in three places (the API order
mapper and two web containers). The PR extracts `formatOrderReference(order)` into
`@atlas/shared` with a spec and replaces the three copies. Everything follows the conventions;
there is nothing to find. Checks that air-review approves a touch-three-modules refactor
without inventing findings, and that routing explains why it did not pick `heavy` despite
three modules being touched (or why it did, if the module-count rule wins).

## Files touched

| File                                                                 | Change                                   |
| -------------------------------------------------------------------- | ---------------------------------------- |
| `libs/shared/src/orders/reference.ts`                                | new: `formatOrderReference`, `parseOrderReference` |
| `libs/shared/src/orders/reference.spec.ts`                           | new: spec                                |
| `libs/shared/src/index.ts`                                           | barrel export                            |
| `apps/api/src/modules/orders/orders.service.ts`                      | `toOrderResponse` uses the helper        |
| `apps/web/src/app/features/orders/order-detail.container.ts`         | private `formatReference` removed        |
| `apps/web/src/app/features/orders/order-editor.container.ts`         | inline template string removed           |

Six files, roughly 70 added / 15 removed lines. Existing specs keep passing
(`orders.service.spec.ts` already asserts `ORD-2026-001041`).

## Opening the PR

```bash
git switch scenario/05-clean-small-refactor
git push origin scenario/05-clean-small-refactor
```

Title suggestion: `refactor(orders): share formatOrderReference`.

## Expected air-review behaviour

- **Routing:** `standard` by the thresholds (6 files > 3, but only ~77 changed lines, so the
  three-module rule does not escalate to `heavy`); in `hybrid` mode the triage model may lower
  it to `light`. The Routing block must say which and why.
- **Deterministic rules:** none fire. `angular.subscription-lifecycle` sees the unchanged
  `subscribe(` calls in the two containers, all with `takeUntilDestroyed`.
- **Model findings:** zero. The model must not ask for the helper to be moved elsewhere or
  for the padding width to be configurable.
- **Vote:** Approved (10) — this is the auto-approve case.
- **Build validation:** exit code 0.
