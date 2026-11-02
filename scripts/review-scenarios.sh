#!/usr/bin/env bash
# Run air-review on every scenario branch and print the routing tier and verdict.
#
#   ./scripts/review-scenarios.sh            # offline, provider mock (free, deterministic rules only)
#   AIR_REVIEW_PROVIDER= ./scripts/review-scenarios.sh   # real provider from air-review.yaml / env
#   ./scripts/review-scenarios.sh scenario/06-defects    # one branch
#
# Requires: air-review on the PATH (npm link in air-review-poc), a clean working tree.
set -euo pipefail
cd "$(dirname "$0")/.."

export AIR_REVIEW_PROVIDER="${AIR_REVIEW_PROVIDER-mock}"
branches=("$@")
if [ ${#branches[@]} -eq 0 ]; then
  branches=(
    scenario/01-translation-only
    scenario/02-classification-task
    scenario/03-order-returns-feature
    scenario/04-repush-docs-only
    scenario/05-clean-small-refactor
    scenario/06-defects
  )
fi

current="$(git rev-parse --abbrev-ref HEAD)"
trap 'git switch -q "$current"' EXIT
printf '%-36s %-9s %-26s %-6s %-28s %s\n' BRANCH TIER REVIEWER CALLS VERDICT "OPEN FINDINGS"
for branch in "${branches[@]}"; do
  git switch -q "$branch"
  rm -rf .air-review/state.json .air-review/cache
  # Scenario 04 is a second push on the branch of scenario 03: review 03 first so
  # the ledger exists, then the docs-only push on top of it.
  if [ "$branch" = "scenario/04-repush-docs-only" ]; then
    git switch -q scenario/03-order-returns-feature
    air-review dry-run --ci local --base main --json --plain >/dev/null || true
    git switch -q "$branch"
  fi
  out="$(air-review dry-run --ci local --base main --json --plain || true)"
  node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const open = d.findings.filter((f) => f.status === "OPEN" || f.status === "REOPENED");
    const r = d.routing;
    console.log(
      [process.argv[1].padEnd(36), (r ? r.tier : "-").padEnd(9), (r ? r.reviewerModel : "-").padEnd(26),
       String(d.metrics.modelCalls).padEnd(6), (d.verdict + (d.skipped ? " (skipped)" : "")).padEnd(28),
       open.map((f) => `${f.severity}:${f.ruleId}`).join(", ") || "none"].join(" "));
  ' "$branch" <<<"$out"
done
