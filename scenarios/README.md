# air-review scenarios

> **Résumé.** Ce dossier décrit six branches de test, une par pull request, qui exercent le
> reviewer automatique air-review sur ce dépôt. Chaque fichier `0N-*.md` explique le but de la
> branche, les fichiers touchés, comment ouvrir la PR sur Azure DevOps et le comportement attendu
> du bot (tier de routage, règles déclenchées, vote). Les branches partent toutes de `main`, sauf
> le scénario 4 qui simule un second push sur la PR du scénario 3.

These scenarios exist to check that air-review behaves as documented when it reviews pull
requests on this repository. Each branch is meant to be pushed as-is and opened as a PR into
`main`. The expected behaviour is written against the tool's documented rules:

- **Routing tiers** (defaults of `air-review.yaml`, section `routing`). `light` (cheap model)
  for diffs of at most 3 files and 150 changed lines in a single module, or when no source
  code changes at all (translation, data, config). `heavy` (strong model) for at least
  10 files, or at least 400 changed lines, or at least 3 top-level modules (`apps/web`,
  `apps/api`, `libs/shared`). `standard` otherwise; in `hybrid` mode the cheap triage model may
  refine that middle band. Pushes that only touch docs or binaries (`review.modelSkipKinds`)
  trigger no model call at all. The chosen tier, model and reasons are printed in the summary
  comment under "Routing" and by `air-review inspect`.
- **Deterministic rules** run before any model call: `security.secret-in-code`,
  `angular.subscription-lifecycle`, `angular.container-presenter`.
- **Votes.** Approved (10) when nothing is open; Approved with suggestions (5) when only
  non-blocking findings remain (gate passed); Waiting for author (-5) when the gate fails
  (BLOCKER/CRITICAL at confidence ≥ 0.9). Build validation exits with code 10 when the gate fails.
- **Re-runs.** A second push on an already-reviewed PR is diffed against the last reviewed
  commit; if the delta contains nothing reviewable the previous verdict is kept without calling
  a model.

## Index

| # | Branch                             | What changes                                                    | Expected tier     | Expected verdict                          |
| - | ---------------------------------- | --------------------------------------------------------------- | ----------------- | ----------------------------------------- |
| 1 | `scenario/01-translation-only`     | 3 French strings in `fr.json`                                   | light             | Approved (10), no findings                |
| 2 | `scenario/02-classification-task`  | Ticket priority classifier in the support module (3 files)      | light             | Approved (10), no findings expected       |
| 3 | `scenario/03-order-returns-feature`| Cross-module "order returns" feature (shared + api + web + i18n)| heavy             | Approved (10), MINOR/INFO notes possible  |
| 4 | `scenario/04-repush-docs-only`     | Second push on #3: changelog and README only                    | n/a (delta empty) | Previous verdict kept, 0 model calls      |
| 5 | `scenario/05-clean-small-refactor` | Extract `formatOrderReference` into `@atlas/shared`             | standard or light | Approved (10), zero findings              |
| 6 | `scenario/06-defects`              | Four planted problems (secret, leaked subscription, bad component, wrong discount maths, prompt injection) | standard | Waiting for author (-5), build exit code 10 |

## How to run a scenario

```bash
git fetch origin
git switch scenario/0N-<slug>
git push origin scenario/0N-<slug>
# then on Azure DevOps: Repos → Pull requests → New → source scenario/0N-<slug>, target main
```

air-review is triggered by the PR creation (and by every later push). Compare the summary
comment and inline comments with the "Expected air-review behaviour" section of the scenario
file. Scenario 4 must be pushed onto the same PR as scenario 3 (it is a fast-forward of that
branch), not opened as a new PR.
