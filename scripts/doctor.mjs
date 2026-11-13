#!/usr/bin/env node
// Checks that this machine can work on this repo, and says what's missing.
//
// Shared by every project that follows the agent protocol: edit it in the agent-protocol repo,
// then sync it into each project. A project adds its own checks in scripts/doctor.local.mjs and
// its settings under "agentProtocol" in package.json:
//
//   "agentProtocol": {
//     "docker": "optional",                   // "required", "optional" or "unused" (default)
//     "dockerFor": "Docker Compose",          // what Docker is used for, shown when it's missing
//     "env": { "required": ["A", "B|C"] }     // names .env must set; "B|C" means either
//   }
//
// It never prints a secret's value: only the names of the settings it checks. It changes nothing
// except `git fetch`, which refreshes the remote refs. Exit code 1 means at least one FAIL.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const results = [];
const add = (level) => (name, detail) => results.push({ level, name, detail });
const ok = add('ok');
const note = add('note');
const warn = add('warn');
const fail = add('FAIL');

function run(cmd, args, { timeout = 20000, cwd = root } = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GH_PROMPT_DISABLED: '1' },
  });
  return {
    ok: !r.error && r.status === 0,
    missing: r.error?.code === 'ENOENT',
    timedOut: r.error?.code === 'ETIMEDOUT',
    out: (r.stdout || '').trim(),
    err: (r.stderr || '').trim(),
  };
}
const firstLine = (s) => (s || '').split('\n').find((l) => l.trim()) || 'no output';

// The repo root: npm runs scripts from the package root; fall back to git's top level.
let root = process.cwd();
if (!existsSync(join(root, 'AGENTS.md'))) {
  const top = run('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() });
  if (top.ok) root = top.out;
}
const path = (p) => join(root, p);
const readJson = (p) => { try { return JSON.parse(readFileSync(path(p), 'utf8')); } catch { return {}; } };
const pkg = readJson('package.json');
const config = pkg.agentProtocol || {};

// Reads a .env file into a map. Values are kept only for local checks that need a path; this
// script prints names, never values.
function readEnv(file = '.env') {
  const env = new Map();
  if (!existsSync(path(file))) return env;
  for (const line of readFileSync(path(file), 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    env.set(m[1], value);
  }
  return env;
}

// --- git and the network -------------------------------------------------------------------
function checkGit() {
  if (run('git', ['--version']).missing) return fail('git', 'not installed');
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const dirty = run('git', ['status', '--porcelain']).out !== '';
  if (!run('git', ['config', 'user.name']).out || !run('git', ['config', 'user.email']).out) {
    fail('git identity', 'no commit author set, so nothing can be committed. Set git config user.name and user.email.');
  }

  const fetch = run('git', ['fetch', '--quiet', '--prune', 'origin'], { timeout: 45000 });
  if (!fetch.ok) {
    fail('network', `can't fetch from origin (${fetch.timedOut ? 'timed out' : firstLine(fetch.err)}). `
      + 'Open PRs and remote branches can\'t be checked, and refs may be stale.');
  } else ok('network', 'fetched origin');

  const where = `on ${branch}${dirty ? ', with uncommitted changes' : ''}`;
  const counts = run('git', ['rev-list', '--left-right', '--count', `${branch}...@{upstream}`]);
  if (!counts.ok) return note('git', `${where}; the branch tracks no remote branch`);
  const [ahead, behind] = counts.out.split(/\s+/).map(Number);
  if (behind > 0) {
    warn('git', `${where}; ${behind} commit(s) behind its remote. `
      + (dirty ? 'Commit or ask the user before pulling.' : 'Run git pull --ff-only.'));
  } else if (ahead > 0) {
    warn('git', `${where}; ${ahead} commit(s) not pushed`);
  } else ok('git', `${where}, up to date with its remote`);
}

// --- GitHub CLI ------------------------------------------------------------------------------
let ghReady = false;
function checkGh() {
  if (run('gh', ['--version']).missing) {
    return fail('gh', 'not installed. Agents need the GitHub CLI to check open PRs and open their own: https://cli.github.com');
  }
  const auth = run('gh', ['auth', 'status']);
  if (!auth.ok) return fail('gh', 'not signed in. Run gh auth login.');
  ghReady = true;
  ok('gh', 'signed in');
}

// --- Node and dependencies -------------------------------------------------------------------
function checkNode() {
  const have = process.versions.node;
  const haveMajor = Number(have.split('.')[0]);
  const engines = pkg.engines?.node;
  const min = engines?.match(/^>=\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (min) {
    const want = [min[1], min[2] || 0, min[3] || 0].map(Number);
    const got = have.split('.').map(Number);
    const below = want.findIndex((n, i) => got[i] !== n);
    if (below !== -1 && got[below] < want[below]) return fail('node', `Node ${have}; this repo needs ${engines}`);
  }
  if (existsSync(path('.nvmrc'))) {
    const pin = readFileSync(path('.nvmrc'), 'utf8').trim().replace(/^v/, '');
    if (Number(pin.split('.')[0]) !== haveMajor) {
      return warn('node', `Node ${have}; this repo's .nvmrc pins ${pin}. Run nvm use (or install Node ${pin}).`);
    }
    return ok('node', `Node ${have}, matching .nvmrc (${pin})`);
  }
  ok('node', `Node ${have}`);
}

function checkDependencies() {
  if (!existsSync(path('package.json'))) return;
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies }).length;
  if (!declared && !pkg.workspaces) return ok('dependencies', 'none declared');
  const locked = existsSync(path('package-lock.json'));
  const install = locked ? 'npm ci' : 'npm install';
  const installed = path('node_modules/.package-lock.json');
  if (!existsSync(path('node_modules')) || !existsSync(installed)) {
    return fail('dependencies', `not installed. Run ${install}.`);
  }
  if (locked && statSync(path('package-lock.json')).mtimeMs > statSync(installed).mtimeMs + 1000) {
    return warn('dependencies', 'package-lock.json changed since the last install. Run npm ci.');
  }
  ok('dependencies', 'installed');
}

// --- Docker ----------------------------------------------------------------------------------
function checkDocker() {
  const need = config.docker || 'unused';
  if (need === 'unused') return;
  const report = need === 'required' ? fail : warn;
  const usedFor = config.dockerFor ? ` (needed for ${config.dockerFor})` : '';
  if (run('docker', ['--version']).missing) return report('docker', `not installed${usedFor}`);
  const info = run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 15000 });
  if (!info.ok) return report('docker', `installed, but the daemon isn't reachable${usedFor}: ${firstLine(info.err)}`);
  ok('docker', `Docker ${info.out}`);
}

// --- .env ------------------------------------------------------------------------------------
function checkEnv() {
  if (!existsSync(path('.env.example'))) return;
  if (!existsSync(path('.env'))) {
    const required = config.env?.required || [];
    return (required.length ? fail : warn)('.env', 'missing. Copy .env.example to .env and fill it in (docs/SETUP.md).');
  }
  const env = readEnv('.env');
  const example = readEnv('.env.example');
  const isSet = (name) => Boolean(env.get(name) || process.env[name]);
  const missing = (config.env?.required || []).filter((spec) => !spec.split('|').some(isSet));
  if (missing.length) fail('.env', `not set: ${missing.map((s) => s.replace(/\|/g, ' or ')).join(', ')}`);
  else ok('.env', 'present' + (config.env?.required?.length ? ', with the required settings' : ''));
  const unknown = [...env.keys()].filter((name) => !example.has(name));
  if (unknown.length) {
    note('.env', `settings not in .env.example (left from an older setup?): ${unknown.join(', ')}`);
  }
}

// --- This protocol's version -----------------------------------------------------------------
function checkProtocol() {
  const agents = existsSync(path('AGENTS.md')) ? readFileSync(path('AGENTS.md'), 'utf8') : '';
  const m = agents.match(/<!-- agent-protocol:start ([\w.-]+\/[\w.-]+)@([0-9a-f]{7,40})/);
  if (!m) return warn('protocol', 'AGENTS.md has no agent-protocol block');
  const [, repo, sha] = m;
  if (!ghReady) return note('protocol', `at ${repo}@${sha.slice(0, 7)}; can't check for a newer one without gh`);
  const cmp = run('gh', ['api', `repos/${repo}/compare/${sha}...main`, '--jq',
    '[.status, ([.files[]?.filename] | join(","))] | @tsv']);
  const resync = 'Sync this repo to its main in a PR (see that repo\'s README).';
  if (!cmp.ok) {
    return warn('protocol', `at ${sha.slice(0, 7)}, which ${repo} can't compare with its main (${firstLine(cmp.err)}). ${resync}`);
  }
  const [status, files = ''] = cmp.out.split('\t');
  if (status === 'diverged') {
    return warn('protocol', `at ${sha.slice(0, 7)}, which isn't in ${repo}'s main any more (its history was rewritten). ${resync}`);
  }
  const shared = files.split(',').filter((f) => f === 'PROTOCOL.md' || f === 'scripts/doctor.mjs');
  if (status === 'ahead' && shared.length) {
    return warn('protocol', `${repo} changed ${shared.join(' and ')} since ${sha.slice(0, 7)}. `
      + 'Sync it into this repo in a PR (see that repo\'s README).');
  }
  ok('protocol', `${repo}@${sha.slice(0, 7)}, up to date`);
}

// --- Run -------------------------------------------------------------------------------------
checkGit();
checkGh();
checkNode();
checkDependencies();
checkDocker();
checkEnv();
checkProtocol();

const local = path('scripts/doctor.local.mjs');
if (existsSync(local)) {
  try {
    const mod = await import(pathToFileURL(local).href);
    await mod.default({ ok, note, warn, fail, run, root, path, readEnv, ghReady });
  } catch (error) {
    fail('local checks', `scripts/doctor.local.mjs failed: ${error.message}`);
  }
}

const width = Math.max(...results.map((r) => r.name.length));
console.log(`${pkg.name || 'this repo'}: doctor\n`);
for (const r of results) console.log(`  ${r.level.padEnd(4)}  ${r.name.padEnd(width)}  ${r.detail}`);
const fails = results.filter((r) => r.level === 'FAIL').length;
const warns = results.filter((r) => r.level === 'warn').length;
console.log('');
if (!fails && !warns) console.log('Ready.');
else {
  console.log(`${fails} FAIL, ${warns} warn. `
    + 'Agents: fix what you can, and tell the user about the rest. docs/SETUP.md has the setup steps.');
}
process.exit(fails ? 1 : 0);
