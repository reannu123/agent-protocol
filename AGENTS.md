# Working in agent-protocol

This repo holds the protocol every project in the README's list follows. `PROTOCOL.md` and
`scripts/doctor.mjs` are copied into those projects by `scripts/sync.mjs`; the README says how.

- **Change the protocol here**, never in a project's copy. Merge it here first, then sync it
  into each project in a PR of that project.
- **Keep it tool-neutral.** It must work for any agent in any tool on any machine: no rule may
  need a feature only one tool has (Claude artifacts, a tool's memory, `@` imports outside
  `CLAUDE.md`).
- **The owner decides what the protocol says.** A change to how agents work is the owner's
  decision: propose it, and record the date they made it in the PR description.
- **`scripts/doctor.mjs` runs in every project.** Keep it free of dependencies, working on the
  oldest Node any project allows (20.19), and never let it print a secret's value. Try it in
  each project (`node ../agent-protocol/scripts/doctor.mjs` from the project's root) before
  merging a change.
- **Keep the README's guides true.** When a change alters what a project needs or how it's set
  up (the templates, the doctor's settings or its local-check function, the sync), update the
  README in the same PR.
- **Name no project in what gets copied.** `PROTOCOL.md`, `scripts/doctor.mjs` and `templates/`
  say how any project works; a project's own needs go in that project.
- Write the way `PROTOCOL.md` does: plain words, short sentences, absolute dates.

## Before every PR

`node --check scripts/doctor.mjs && node --check scripts/sync.mjs` must pass, and the doctor must
run cleanly in each project in the README's list.
