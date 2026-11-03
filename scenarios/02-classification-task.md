# Scenario 02 — small, self-contained logic (ticket priority classification)

Branch: `scenario/02-classification-task` (from `main`)

## Purpose

A short, correct piece of business logic confined to one API module: a rule-based classifier
that assigns `P1`–`P4` to a support ticket from keywords, customer tier and order value, with
its spec, wired into `SupportService.create`. Checks that a small change in a single module
is routed to the light tier and approved, and that a deterministic classification task does not
trigger spurious findings.

## Files touched

| File                                                   | Change                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `apps/api/src/modules/support/priority.ts`             | new: `classifyTicketPriority(input): 'P1' \| 'P2' \| 'P3' \| 'P4'` |
| `apps/api/src/modules/support/priority.spec.ts`        | new: vitest spec covering every rule                        |
| `apps/api/src/modules/support/support.service.ts`      | `create()` calls the classifier instead of the fixed `P3`   |

Less than 150 lines in total; the existing spec `support.service.spec.ts` keeps passing
because the seed ticket subjects still classify as `P3`.

## Opening the PR

```bash
git switch scenario/02-classification-task
git push origin scenario/02-classification-task
```

Title suggestion: `feat(support): rule-based ticket priority`.

## Expected air-review behaviour

- **Routing:** `light`: 3 files and about 115 changed lines, all in `apps/api`, within the
  light limits (≤ 3 files, ≤ 150 lines, one module). The summary says which tier and why.
- **Deterministic rules:** none fire (no secret, no component, no i18n change).
- **Model findings:** none expected. An INFO note about the keyword list being
  English-only is plausible and acceptable.
- **Vote:** none from the review step; Approved (10) by the `air-review approve` step once build and tests pass.
- **Build validation:** exit code 0.
