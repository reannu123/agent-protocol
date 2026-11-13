#!/usr/bin/env node
// Copies this protocol into projects: node scripts/sync.mjs ../agent-runtime ../agent-workbench
//
// For each project it
// - replaces the block between the agent-protocol markers in AGENTS.md with PROTOCOL.md, and
//   stamps the start marker with this repo and its commit;
// - copies scripts/doctor.mjs to the project's scripts/doctor.mjs;
// - checks that package.json runs it as `npm run doctor`.
// It commits nothing: review the diff and commit it in a PR in each project.
//
// Run it from a clean checkout whose commit is on origin/main, so the stamp names a commit
// every machine can see. A project without the markers needs them added by hand once:
//   <!-- agent-protocol:start -->
//   <!-- agent-protocol:end -->

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-C', here, ...args], { encoding: 'utf8' }).trim();
const die = (message) => { console.error(message); process.exit(1); };

const targets = process.argv.slice(2);
if (!targets.length) die('Usage: node scripts/sync.mjs <project-dir>...');

if (git('status', '--porcelain')) die('agent-protocol has uncommitted changes. Commit and push them first.');
const sha = git('rev-parse', 'HEAD');
git('fetch', '--quiet', 'origin');
try { git('merge-base', '--is-ancestor', sha, 'origin/main'); } catch {
  die(`agent-protocol's commit ${sha.slice(0, 7)} isn't on origin/main. Merge and pull it first.`);
}
const remote = git('remote', 'get-url', 'origin');
const slug = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/)?.[1];
if (!slug) die(`Can't read owner/repo from the remote ${remote}.`);

const protocol = readFileSync(join(here, 'PROTOCOL.md'), 'utf8').trim();
const doctor = readFileSync(join(here, 'scripts/doctor.mjs'), 'utf8');
const start = `<!-- agent-protocol:start ${slug}@${sha} (synced; edit PROTOCOL.md in ${slug}, not here) -->`;
const end = '<!-- agent-protocol:end -->';
const block = /<!-- agent-protocol:start[^>]*-->[\s\S]*?<!-- agent-protocol:end -->/;

for (const target of targets) {
  const dir = resolve(target);
  const agentsPath = join(dir, 'AGENTS.md');
  if (!existsSync(agentsPath)) { console.error(`${dir}: no AGENTS.md; skipped`); continue; }
  const agents = readFileSync(agentsPath, 'utf8');
  if (!block.test(agents)) { console.error(`${dir}: AGENTS.md has no agent-protocol markers; skipped`); continue; }
  writeFileSync(agentsPath, agents.replace(block, () => `${start}\n\n${protocol}\n\n${end}`));

  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts/doctor.mjs'), doctor);

  const pkgPath = join(dir, 'package.json');
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : null;
  const wired = pkg?.scripts?.doctor === 'node scripts/doctor.mjs';
  console.log(`${dir}: synced to ${slug}@${sha.slice(0, 7)}`
    + (wired ? '' : '. Add "doctor": "node scripts/doctor.mjs" to package.json\'s scripts.'));
}
