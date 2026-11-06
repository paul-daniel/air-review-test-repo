#!/usr/bin/env node
// Recreate the scenario branches on top of YOUR main and push them to your
// Azure DevOps repository, so you can open one pull request per scenario from
// the web UI without typing any change by hand.
//
//   node scripts/push-scenario-branches.mjs             # scenarios 1, 2, 3, 5, 6 (one branch each)
//   node scripts/push-scenario-branches.mjs repush      # later: scenario 4 = second push on the branch of scenario 3
//   node scripts/push-scenario-branches.mjs --remote azure   # when the Azure DevOps remote is not "origin"
//   node scripts/push-scenario-branches.mjs --no-push   # only create the local branches
//   node scripts/push-scenario-branches.mjs --base master   # when your main branch has another name
//
// How it works: the scenario changes are fetched from the public GitHub copy
// (no GitHub account needed, nothing is sent to GitHub) and re-applied as a
// commit on a branch cut from your local `main`. That is what makes it work
// even when your repository started from a zip download and shares no history
// with GitHub. Requires: git, a clean working tree, your `main` up to date.
import { execSync } from "node:child_process";

const GITHUB = "https://github.com/paul-daniel/air-review-test-repo.git";
const SCENARIOS = [
  ["scenario/01-translation-only", "Scenario 01: French translations for order returns"],
  ["scenario/02-classification-task", "Scenario 02: rule-based ticket priority classifier"],
  ["scenario/03-order-returns-feature", "Scenario 03: order returns across shared, api and web"],
  ["scenario/05-clean-small-refactor", "Scenario 05: share formatOrderReference"],
  ["scenario/06-defects", "Scenario 06: order alerts and loyalty discount"],
  ["scenario/07-promotions", "Scenario 07: promotions across shared, api and web"],
];
const REPUSH = {
  onto: "scenario/03-order-returns-feature",
  from: "scenario/04-repush-docs-only",
  title: "Scenario 04: changelog and README for order returns",
};

const args = process.argv.slice(2);
const mode = args.includes("repush") ? "repush" : "open";
const push = !args.includes("--no-push");
const remoteFlag = args.indexOf("--remote");

function sh(command, options = {}) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: true, ...options }).trim();
}
function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}
function detectAzureRemote() {
  const remotes = sh("git remote -v").split("\n");
  const hit = remotes.find((line) => /dev\.azure\.com|visualstudio\.com/.test(line) && /\(push\)/.test(line));
  if (!hit) fail("No Azure DevOps remote found. Add one (git remote add azure <url>) or pass --remote <name>.");
  return hit.split(/\s+/)[0];
}

if (sh("git status --porcelain")) fail("The working tree has uncommitted changes. Commit or stash them first.");
const startBranch = sh("git rev-parse --abbrev-ref HEAD");
const baseFlag = args.indexOf("--base");
const TARGET = baseFlag >= 0 ? args[baseFlag + 1] : hasBranch("main") ? "main" : startBranch;
if (!hasBranch(TARGET)) fail(`Local branch "${TARGET}" not found. Pass --base <your main branch>.`);
if (TARGET !== "main") console.log(`Base branch: ${TARGET} (open the pull requests into that branch).`);

function hasBranch(name) {
  try {
    sh(`git rev-parse --verify --quiet refs/heads/${name}`);
    return true;
  } catch {
    return false;
  }
}
const remote = push ? (remoteFlag >= 0 ? args[remoteFlag + 1] : detectAzureRemote()) : null;

console.log("Fetching the scenarios from GitHub (public, anonymous)…");
sh(`git fetch --quiet ${GITHUB} "+refs/heads/main:refs/remotes/scenarios/main" "+refs/heads/scenario/*:refs/remotes/scenarios/scenario/*"`);

/** Apply the changes of `to` since it left `from` (on GitHub) as one commit on the current branch. */
function replay(from, to, title) {
  // Not through sh(): a patch must keep its final newline.
  const patch = execSync(`git diff --binary refs/remotes/scenarios/${from}...refs/remotes/scenarios/${to}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (!patch.trim()) fail(`${to}: no difference with ${from} on GitHub; nothing to replay.`);
  try {
    execSync("git apply --3way --whitespace=nowarn", { input: patch, stdio: ["pipe", "pipe", "pipe"], shell: true });
  } catch (error) {
    sh("git checkout -- . && git clean -fdq");
    fail(`${to}: the changes do not apply cleanly on your ${TARGET} (is it the same content as the GitHub main?).\n${error.stderr ?? ""}`);
  }
  sh("git add -A");
  sh(`git -c commit.gpgsign=false commit --quiet -m "${title}"`);
  return sh("git rev-parse --short HEAD");
}

function pushBranch(branch) {
  if (!push) return "local only";
  try {
    sh(`git push --quiet ${remote} ${branch}`);
    return "pushed";
  } catch (error) {
    const text = `${error.stderr ?? ""}`;
    if (/rejected|non-fast-forward|fetch first/i.test(text)) return `NOT pushed: ${branch} already exists on ${remote} with other commits`;
    fail(`git push failed for ${branch}:\n${text}`);
  }
}

const results = [];
try {
  if (mode === "repush") {
    try {
      sh(`git rev-parse --verify --quiet refs/heads/${REPUSH.onto}`);
    } catch {
      fail(`Local branch ${REPUSH.onto} not found: run the script without "repush" first.`);
    }
    sh(`git switch --quiet ${REPUSH.onto}`);
    const sha = replay(REPUSH.onto, REPUSH.from, REPUSH.title);
    results.push([REPUSH.onto, sha, pushBranch(REPUSH.onto)]);
  } else {
    for (const [branch, title] of SCENARIOS) {
      let exists = true;
      try {
        sh(`git rev-parse --verify --quiet refs/heads/${branch}`);
      } catch {
        exists = false;
      }
      if (exists) {
        results.push([branch, sh(`git rev-parse --short ${branch}`), "already exists locally; left as is"]);
        continue;
      }
      sh(`git switch --quiet -c ${branch} ${TARGET}`);
      const sha = replay("main", branch, title);
      results.push([branch, sha, pushBranch(branch)]);
    }
  }
} finally {
  sh(`git switch --quiet ${startBranch}`);
}

console.log("\nBranches:");
for (const [branch, sha, state] of results) console.log(`  ${sha}  ${branch.padEnd(36)} ${state}`);
if (mode === "repush") {
  console.log("\nThe open pull request of scenario 3 now has a new head: the next review is incremental (docs only, no model call).");
} else {
  console.log(
    "\nNext: open one pull request per branch into main from the web UI (Repos → Pull requests → New pull request).\n" +
      "Scenario 4 comes after scenario 3 was reviewed once: node scripts/push-scenario-branches.mjs repush",
  );
}
