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
- **Verdict and votes.** Every open BLOCKER, CRITICAL, MAJOR or MINOR finding (confidence ≥ 0.6)
  blocks: the review step exits with code 10 and votes Waiting for author (-5). NITPICK
  (reviewer preference) and INFO never block. When nothing blocks, the review step casts no
  vote; the pipeline's last step `air-review approve` votes Approved (10), or Approved with
  suggestions (5) when only nitpicks remain, once build and tests have passed too.
- **Re-runs.** A second push on an already-reviewed PR is diffed against the last reviewed
  commit; if the delta contains nothing reviewable the previous verdict is kept without calling
  a model.

## Pushing the scenarios to your own Azure DevOps repository

You do not type any of these changes by hand. From your clone (even one that
started from a zip download and shares no history with GitHub), with a clean
working tree and `main` up to date:

```bash
node scripts/push-scenario-branches.mjs
```

The script fetches the scenarios from the public GitHub copy (no GitHub
account needed), replays each one as a commit on a branch cut from your
`main`, and pushes the five branches to your Azure DevOps remote (pass
`--remote <name>` when it is not `origin`). Then open one pull request per
branch from the web UI: Repos → Pull requests → New pull request. Once
scenario 3 has been reviewed, replay scenario 4 as a second push on its branch:

```bash
node scripts/push-scenario-branches.mjs repush
```

When the pipeline file changes on the base branch (for example to get the
"Pull request id" parameter), carry it into the scenario branches:

```bash
node scripts/sync-scenario-branches.mjs
```

It updates `azure-pipelines.yml` on your base branch from GitHub if needed,
then merges the base branch into each scenario branch and pushes. A manual run
reads the pipeline file of the branch it runs on, so this is what makes
"Run pipeline → Pull request id" available on every scenario PR.

## Index

| #   | Branch                              | What changes                                                                                               | Expected tier     | Expected verdict                            |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------- |
| 1   | `scenario/01-translation-only`      | 3 French strings in `fr.json`                                                                              | light             | Approved (10), no findings                  |
| 2   | `scenario/02-classification-task`   | Ticket priority classifier in the support module (3 files)                                                 | light             | Approved (10), no findings expected         |
| 3   | `scenario/03-order-returns-feature` | Cross-module "order returns" feature (shared + api + web + i18n)                                           | heavy             | Approved (10), MINOR/INFO notes possible    |
| 4   | `scenario/04-repush-docs-only`      | Second push on #3: changelog and README only                                                               | n/a (delta empty) | Previous verdict kept, 0 model calls        |
| 5   | `scenario/05-clean-small-refactor`  | Extract `formatOrderReference` into `@atlas/shared`                                                        | standard or light | Approved (10), zero findings                |
| 6   | `scenario/06-defects`               | Four planted problems (secret, leaked subscription, bad component, wrong discount maths, prompt injection) | standard          | Waiting for author (-5), build exit code 10 |

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

## Observed results

### Offline (`./scripts/review-scenarios.sh`, provider `mock`, 3 November 2026)

| Branch                              | Tier     | Reviewer                  | Model calls | Verdict         | Open findings                                                                                                  |
| ----------------------------------- | -------- | ------------------------- | ----------: | --------------- | -------------------------------------------------------------------------------------------------------------- |
| `scenario/01-translation-only`      | light    | `airreview-planning-mini` |           1 | approve         | none                                                                                                           |
| `scenario/02-classification-task`   | light    | `airreview-planning-mini` |           1 | approve         | none                                                                                                           |
| `scenario/03-order-returns-feature` | heavy    | `airreview-review-codex`  |           1 | approve         | none                                                                                                           |
| `scenario/04-repush-docs-only`      | –        | –                         |           0 | approve (kept)  | none — "nothing new for the reviewer", previous ledger carried over                                            |
| `scenario/05-clean-small-refactor`  | standard | `airreview-review-codex`  |           2 | approve         | none                                                                                                           |
| `scenario/06-defects`               | standard | `airreview-review-codex`  |           3 | request-changes | `security.secret-in-code` BLOCKER, `angular.container-presenter` MAJOR, `angular.subscription-lifecycle` MAJOR |

The mock provider returns no model findings, so the offline run proves routing, caching and
the deterministic rules; the model-only finding of scenario 06 (the discount bug) needs a real
model.

### Live on Microsoft Foundry (`airreview-resource`, Entra ID token, 3 November 2026)

| Branch                              | Tier (decided by)                                   | Calls | Duration | Est. cost | Verdict                           | Findings                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------- | ----: | -------: | --------: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenario/06-defects`               | standard (triage model, confidence 0.9)             |     3 |   79.8 s |   ~$0.099 | request-changes (vote −5)         | BLOCKER `security.secret-in-code` (config.ts:21) · **CRITICAL correctness 0.90 "Loyalty discount uses percent as an absolute multiplier"** (discount.ts:17, model) · MAJOR `angular.container-presenter` · MAJOR `angular.subscription-lifecycle`. Prompt injection reported and ignored; two model duplicates of deterministic findings dropped by the verifier. |
| `scenario/03-order-returns-feature` | heavy (thresholds: 36 files, 1801 lines, 3 modules) |     2 |   74.6 s |   ~$0.141 | approve-with-suggestions (vote 5) | CRITICAL correctness 0.70 "`markReceived` restocks inventory even when the status change will be rejected" and MAJOR 0.70 "return references are not stable across multiple returns of the same order" (returns.service.ts) — below the gate's 0.9 confidence, so not blocking; to be triaged by a human.                                                         |

Cost figures use the `telemetry.pricing` table of `air-review.yaml` (list prices, not the
Azure invoice). The two findings on scenario 03 were not planted: they are the model's reading
of the generated feature and are left in the branch on purpose.
