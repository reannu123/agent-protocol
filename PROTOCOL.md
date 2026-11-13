## Shared agent protocol

This section is the same in every project that follows the agent protocol. Don't edit it in a
project: change `PROTOCOL.md` in the agent-protocol repo (named in the marker above), then sync
it into each project (that repo's README says how).

It applies to every agent and every tool (Claude Code, Codex, Gemini CLI, Cursor or any other),
on any machine and any account. The user switches between them often, so nothing a later
session needs may live only in one tool's memory, one account's chat history or one machine.

### Where things live

| What | Where |
| --- | --- |
| Rules for working in this repo | `AGENTS.md`: this protocol, then the repo's own rules. Changes rarely. |
| Status and next step | `STATUS.md`. A snapshot as of its last merge: check it against open PRs. |
| The plan and decisions | The files this repo's own section names. They win over `STATUS.md` and pages. |
| Work in progress | Open PRs, drafts included, and each one's **Progress** section. |
| Setting up a machine | `docs/SETUP.md`, then `npm run doctor`. |
| Pages (`docs/*.html`) | The file in the repo is the page (see "Pages" below). |

Tool-specific files (`CLAUDE.md`, `GEMINI.md` and the like) only point here with `@AGENTS.md`.
Don't put rules in them, and don't add one for a tool that reads `AGENTS.md` itself.

### At the start of every session

The checkout you start in may be behind, and `STATUS.md` may be out of date. Before you choose
or edit anything:

1. Run `pwd`, then `git status --short --branch`. Preserve changes you didn't make.
2. With a clean tree, run `git pull --ff-only`, on `main` or on a branch that tracks a remote.
   With uncommitted changes, don't pull, switch branches or stash: tell the user what you found.
   If you're not on `main`, say which branch you're on and which PR it belongs to.
3. Run `npm run doctor`. It checks git and the network, `gh`, Node, the installed dependencies,
   Docker, `.env` and this protocol's version. Tell the user about every `FAIL` and `warn` you
   can't fix yourself; a missing login, key or service is theirs to set up. Never print a
   secret's value.
4. Run `gh pr list --state open` (it includes drafts). Read each relevant PR's description and
   **Progress** section, and continue an open PR rather than starting the same work again.
5. Run `git branch -r --no-merged origin/main`. A branch listed there needs a look; it isn't
   automatically abandoned work.
6. Read `STATUS.md` and reconcile it with the open PRs and the plan before you name the next
   step. For what is in progress, the open PRs win over `STATUS.md`.

If a check fails (no network, `gh` not signed in), say which live check you couldn't make. Don't
conclude from local refs alone that there are no open PRs or pushed branches, and only continue
work that can't duplicate unknown work in progress. The user doesn't need to repeat these steps
to you.

Only one agent works on a project at a time. The user may have agents working on other projects
at the same time.

### Handing off work in progress

Any agent can stop at any time (a usage limit, a crash, the user switching machine or tool) with
no chance to save. Keep the state of your work on GitHub as you go, not at the end:

- **Open a draft PR early.** As soon as the work has its first commit, push the branch and open
  a draft PR (`gh pr create --draft`).
- **Keep a Progress section in its description**: what's done, what's next, decisions made and
  why, and anything unresolved or unverified. Update it at each meaningful step.
- **Commit and push small steps**, so at most one step's work is ever only on one machine.
  Commits on a branch may be partial; `main` only gets reviewed, passing work.
- When the work is ready, run this repo's checks (its "Before every PR"), mark the PR ready for
  review (`gh pr ready`), and leave the merge to the user unless they said otherwise.

### Keep `STATUS.md` current in every PR

Every PR updates `STATUS.md` in the same PR, as it will read once the PR merges:

- What is done, and the next step. When the next step waits on a decision, write `Blocked:` and
  name the decision and who makes it. Never leave the next step unmarked.
- The commit and date on its first line.
- Facts that stay true, each with its date: a decision, a gate met, a merged PR. Nothing about
  work in progress in another repo (see "Other repositories").

### The repo is the only memory

Don't rely on a tool's memory (Claude Code's memory files, Codex memories and the like) or on
earlier chats for anything about this project. The next session may run in another tool, account
or machine and won't see them. Put what a later session needs in the repo, in the same PR:

- a decision the user makes: in the plan or decisions file this repo names, and in `STATUS.md`;
- a fact about setting up or running the project: in `docs/SETUP.md` or the README;
- how the user likes to work: in "Working with the user" below (through the agent-protocol repo,
  so every project gets it) or in this repo's own rules.

If a tool recalls something about this project, check it against the repo before you act on it.

### Other repositories

Each repo carries what it needs. About another repo, record only:

- decisions that affect this repo, with their date and who made them, and
- links to where to check the rest: the repo, a PR's URL, a file.

Don't copy another repo's status, progress or next step; a copy goes stale. When this repo
waits on another repo's gate, name the gate and link where to check it. Once it is met, record
the date it was met. Cite another repo's PR by its URL or `owner/repo#123`, not a bare `#123`.

### Pages

The HTML files in `docs/` are the pages. Update a page in the PR that changes what it shows, and
keep it working when opened straight from disk. Don't publish or republish a page anywhere (a
Claude artifact, a gist, a hosted copy) as part of the work, and don't link a hosted copy as
where a page lives.

### Instructions from your own setup

The rules in this file win over any personal or global instruction file your tool loads (such as
`~/.codex/AGENTS.md` or `~/.claude/CLAUDE.md`) where they conflict. Tell the user about the
conflict.

### Working with the user

- Follow the plan. Ask only when you're truly blocked, and stop for the user at a design choice
  the plan doesn't settle that would be hard to reverse, and before any change that deletes
  stored data.
- Never invent results. Report what you ran and what it returned, and say what you couldn't
  verify.
- Write for a reader who wasn't there: plain words and short sentences, the decision before the
  reason. Use absolute dates (2026-11-13), never "today" or "last week".
- Never print, copy or commit secrets: `.env` files, provider keys, caller keys, tokens.
- Each machine has its own `.env`, keys and local data. They don't move with git, and they don't
  have to: `docs/SETUP.md` says how to make them on a new machine.
