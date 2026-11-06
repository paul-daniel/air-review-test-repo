#!/usr/bin/env node
// Bring the pipeline file up to date and carry it into every scenario branch.
//
//   node scripts/sync-scenario-branches.mjs                 # base branch: main, or master, or the current one
//   node scripts/sync-scenario-branches.mjs --base master   # explicit base branch
//   node scripts/sync-scenario-branches.mjs --remote azure  # when the Azure DevOps remote is not "origin"
//
// What it does, in order:
//   1. fetches `azure-pipelines.yml` from the public GitHub copy (anonymous) and,
//      if your base branch does not have the current version, commits and pushes it;
//   2. merges the base branch into each local scenario branch and pushes it, so
//      the pull requests run the current pipeline (a manual run reads the YAML
//      of the branch it runs on).
// Requires: git, a clean working tree.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const GITHUB = "https://github.com/paul-daniel/air-review-test-repo.git";
const SCENARIOS = [
  "scenario/01-translation-only",
  "scenario/02-classification-task",
  "scenario/03-order-returns-feature",
  "scenario/05-clean-small-refactor",
  "scenario/06-defects",
];
const MARKER = "pullRequestId"; // present in the current pipeline file only

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function sh(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: true }).trim();
}
function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
function hasBranch(name) {
  try {
    sh(`git rev-parse --verify --quiet refs/heads/${name}`);
    return true;
  } catch {
    return false;
  }
}
function detectAzureRemote() {
  const hit = sh("git remote -v")
    .split("\n")
    .find((line) => /dev\.azure\.com|visualstudio\.com/.test(line) && /\(push\)/.test(line));
  if (!hit) fail("No Azure DevOps remote found. Add one (git remote add azure <url>) or pass --remote <name>.");
  return hit.split(/\s+/)[0];
}

if (sh("git status --porcelain")) fail("The working tree has uncommitted changes. Commit or stash them first.");
const startBranch = sh("git rev-parse --abbrev-ref HEAD");
const base = flag("--base") ?? (hasBranch("main") ? "main" : hasBranch("master") ? "master" : startBranch);
if (!hasBranch(base)) fail(`Local branch "${base}" not found. Pass --base <your main branch>.`);
const remote = flag("--remote") ?? detectAzureRemote();
console.log(`Base branch: ${base} · remote: ${remote}`);

const log = [];
try {
  // 1. Pipeline file on the base branch.
  sh(`git switch --quiet ${base}`);
  console.log("Fetching the current pipeline file from GitHub (public, anonymous)…");
  sh(`git fetch --quiet ${GITHUB} main`);
  const current = sh("git show FETCH_HEAD:azure-pipelines.yml");
  const mine = readFileSync("azure-pipelines.yml", "utf8");
  if (mine.includes(MARKER)) {
    log.push(`${base}: azure-pipelines.yml already current`);
  } else {
    writeFileSync("azure-pipelines.yml", current);
    sh("git add azure-pipelines.yml");
    sh(`git -c commit.gpgsign=false commit --quiet -m "ci: manual review with a pull request id (pipeline update)"`);
    sh(`git push --quiet ${remote} ${base}`);
    log.push(`${base}: azure-pipelines.yml updated and pushed`);
  }

  // 2. Carry the base branch into each scenario branch.
  for (const branch of SCENARIOS) {
    if (!hasBranch(branch)) {
      log.push(`${branch}: not found locally, skipped (run push-scenario-branches.mjs first)`);
      continue;
    }
    sh(`git switch --quiet ${branch}`);
    try {
      sh(`git merge-base --is-ancestor ${base} ${branch}`);
      log.push(`${branch}: already contains ${base}`);
      continue;
    } catch {
      /* needs the merge */
    }
    try {
      sh(`git -c commit.gpgsign=false merge --quiet --no-edit -m "merge ${base}: pipeline update" ${base}`);
    } catch (error) {
      sh("git merge --abort");
      fail(`${branch}: merge conflict with ${base}; resolve it by hand.\n${error.stderr ?? ""}`);
    }
    sh(`git push --quiet ${remote} ${branch}`);
    log.push(`${branch}: merged ${base} and pushed`);
  }
} finally {
  sh(`git switch --quiet ${startBranch}`);
}

console.log("\n" + log.map((line) => `  ${line}`).join("\n"));
console.log(
  "\nNext: Pipelines → Run pipeline → Branch = the scenario branch → Pull request id = the PR number (the !N in its title) → Run.",
);
