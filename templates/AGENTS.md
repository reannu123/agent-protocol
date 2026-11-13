# Working in <project>

<One or two sentences: what this repo is.>

Read the shared protocol below first, then `STATUS.md`, then this repo's own rules after the
protocol.

<!-- agent-protocol:start -->
<!-- agent-protocol:end -->

## This repo

| What | Where |
| --- | --- |
| Status and next step | `STATUS.md` |
| The plan and decisions (the source of truth) | `docs/ROADMAP.md` |
| First time on a machine | `docs/SETUP.md` |

**Everything a session needs is in this repo** and its open PRs. When the user makes a decision
that affects this repo, record it in `docs/ROADMAP.md` and in `STATUS.md`.

## Every PR also updates

<The pages and files this repo's PRs keep current, and when.>

## Before every PR

`npm run build && npm test` must pass. Never print, copy or commit the keys in `.env`.
