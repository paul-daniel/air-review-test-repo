# Scenario 01 — translation-only change

Branch: `scenario/01-translation-only` (from `main`)

## Purpose

Smallest possible PR: a translator fixes three French strings that were still in English.
Checks that air-review recognises a translation-only diff, routes it to the cheap tier and
approves without noise.

## Files touched

| File                                 | Change                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `apps/web/src/assets/i18n/fr.json`   | `orders.returns.title`, `orders.returns.eligibleUntil`, `orders.returns.policyNotice` translated to French (3 lines) |

No key is added or removed; the key set stays identical to `en.json` and `de.json`.

## Opening the PR

```bash
git switch scenario/01-translation-only
git push origin scenario/01-translation-only
```

Azure DevOps → Repos → Pull requests → New pull request → source
`scenario/01-translation-only`, target `main`. Title suggestion:
`i18n(fr): translate order returns strings`.

## Expected air-review behaviour

- **Routing:** `light`. Reasons printed in the summary: 1 file, 3 changed lines, single
  module (`apps/web`), translation-only change.
- **Deterministic rules:** i18n parity passes (same keys in en/fr/de). No secret, no Angular
  rule applies (no `.ts` file in the diff).
- **Model findings:** none expected. The cheap model may confirm the French wording; it must not
  produce a finding.
- **Vote:** Approved (10). Summary comment with the Routing block and "No findings".
- **Build validation:** succeeds (exit code 0).
