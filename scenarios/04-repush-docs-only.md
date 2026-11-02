# Scenario 04 — second push with documentation only

Branch: `scenario/04-repush-docs-only` (from the HEAD of `scenario/03-order-returns-feature`)

## Purpose

Simulates the author pushing a follow-up commit on the PR of scenario 03 after the bot has
already reviewed it. The new commit changes no code: it only adds the release note. Checks that
air-review diffs against the last reviewed commit, finds nothing reviewable, keeps the previous
verdict and does not post duplicate comments or spend model calls.

## Files touched (in the extra commit only)

| File                | Change                                            |
| ------------------- | ------------------------------------------------- |
| `docs/CHANGELOG.md` | "Unreleased" entry for order returns              |
| `README.md`         | returns feature mentioned in the layout table     |

Compared to `main` the branch contains everything from scenario 03 plus this commit; compared
to the scenario 03 HEAD it contains only these two files.

## Opening the PR

This scenario is **not** a new PR. First run scenario 03 and wait for the bot's verdict, then:

```bash
git switch scenario/04-repush-docs-only
git push origin scenario/04-repush-docs-only:scenario/03-order-returns-feature
```

The push is a fast-forward of the source branch of the open PR, which triggers the bot again.

## Expected air-review behaviour

- **Delta detection:** the bot compares the new head with the commit it last reviewed and finds
  only `docs/CHANGELOG.md` and `README.md`.
- **Routing:** not applicable — the summary says "nothing new to review" (docs-only delta) and
  the Routing block reports 0 model calls.
- **Comments:** the existing summary comment is updated (or a short "no new findings" note is
  appended); no inline comment from the first run is re-posted.
- **Vote:** unchanged from scenario 03 (Approved, 10).
- **Build validation:** exit code 0.
