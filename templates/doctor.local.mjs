// This project's own checks for `npm run doctor` (scripts/doctor.mjs, from the agent protocol).
// Copy it to scripts/doctor.local.mjs only if the project needs checks of its own.
// Report each result with ok, note, warn or fail as (name, detail). Never report a secret's value.

import { existsSync } from 'node:fs';

export default async function checks({ ok, note, warn, fail, run, path, readEnv, ghReady }) {
  // Example: a setting that `npm run dev` needs, read from .env or the environment.
  const env = readEnv('.env');
  const url = process.env.SERVICE_URL || env.get('SERVICE_URL');
  if (!url) return warn('service', 'SERVICE_URL isn\'t set, so npm run dev won\'t start. See docs/SETUP.md.');

  // Example: whether that service answers. A note, since tests don't need it.
  try {
    const res = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(3000) });
    if (res.ok) ok('service', `answers at ${url}`);
    else note('service', `${url} answered ${res.status}`);
  } catch {
    note('service', `not running at ${url}. Start it before npm run dev.`);
  }

  // Example: another checkout this repo reads, next to it.
  if (!existsSync(path('../other-repo'))) note('other-repo', 'no clone next to this repo. See docs/SETUP.md.');
}
