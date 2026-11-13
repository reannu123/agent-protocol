# Agent protocol

One way of working for every AI agent on the owner's projects, whatever the tool (Claude Code,
Codex, Gemini CLI, Cursor or another), the account or the machine. The owner switches between
them, sometimes mid-task; the only step on their side is `git checkout main && git pull`. The
next agent picks the work up from the repo alone.

## What it asks of a project

- **`AGENTS.md`**, which every tool reads (Claude Code through a one-line `CLAUDE.md`:
  `@AGENTS.md`). It holds a copy of [`PROTOCOL.md`](PROTOCOL.md) between two markers, then the
  project's own rules: where its plan and decisions live, the pages each PR keeps current, and
  its checks before a PR.
- **`STATUS.md`** at the root: what's done and the next step, kept current by every PR.
- **The plan and decisions** in files the project names, which win over `STATUS.md` and pages.
- **`docs/SETUP.md`**: the first time on a machine. Secrets and local data stay on each
  machine; this says how to make them.
- **`npm run doctor`** ([`scripts/doctor.mjs`](scripts/doctor.mjs)), run at the start of every
  session: git and the network, `gh`, Node, dependencies, Docker, `.env` and the protocol's
  version. A project adds its own checks in `scripts/doctor.local.mjs`.
- **`.nvmrc`**, pinning the Node version its Docker image or CI uses.
- **Pages** are the HTML files in `docs/`. Nothing is published elsewhere.

Each project carries a copy, not a link, so `git pull` alone brings everything, every tool loads
it without fetching another repo, and a session needs no access beyond the project itself.

## Projects that follow it

- [reannu123/agent-runtime](https://github.com/reannu123/agent-runtime)
- [reannu123/agent-workbench](https://github.com/reannu123/agent-workbench)
- [reannu123/sitenatin](https://github.com/reannu123/sitenatin)

## Changing the protocol

1. Change `PROTOCOL.md` or `scripts/doctor.mjs` here, in a PR, and merge it.
2. With this repo checked out next to the projects and pulled, run:

   ```bash
   node scripts/sync.mjs ../agent-runtime ../agent-workbench ../sitenatin
   ```

   It replaces the block in each `AGENTS.md`, stamped with this repo's commit, and copies the
   doctor. It commits nothing.
3. In each project, commit the result in a PR, following that project's rules (its
   `STATUS.md`, and any page its rules say every PR updates).

Until a project syncs, `npm run doctor` there warns that the protocol has changed.

## Adding a project

Copy [`templates/`](templates): `AGENTS.md` (with the markers), `STATUS.md`, `docs/SETUP.md`,
and a `CLAUDE.md` holding only `@AGENTS.md`. Add `"doctor": "node scripts/doctor.mjs"` to its
`package.json` scripts, run the sync for it, and add it to the list above.
