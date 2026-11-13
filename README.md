# Agent protocol

One way of working for every AI agent on the owner's projects, whatever the tool (Claude Code,
Codex, Gemini CLI, Cursor or another), the account or the machine. The owner switches between
them, sometimes mid-task; the only step on their side is `git checkout main && git pull`. The
next agent picks the work up from the repo alone.

[`PROTOCOL.md`](PROTOCOL.md) is the protocol. It says how an agent works in any project and
names no particular one. [`templates/`](templates) and [`scripts/`](scripts) are what a project
needs to follow it.

## What it asks of a project

- **`AGENTS.md`**, which every tool reads (Claude Code through a one-line `CLAUDE.md`:
  `@AGENTS.md`). It holds a copy of `PROTOCOL.md` between two markers, then the project's own
  rules: where its plan and decisions live, the pages each PR keeps current, and its checks
  before a PR.
- **`STATUS.md`** at the root: what's done and the next step, kept current by every PR.
- **The plan and decisions** in files the project names, which win over `STATUS.md` and pages.
- **`docs/SETUP.md`**: the first time on a machine. Secrets and local data stay on each
  machine; this says how to make them.
- **`npm run doctor`** ([`scripts/doctor.mjs`](scripts/doctor.mjs)), run at the start of every
  session: git and the network, `gh`, Node, dependencies, Docker, `.env` and the protocol's
  version. A project adds its own checks (see "Customizing the doctor").
- **`.nvmrc`**, pinning the Node version the project builds and runs on.
- **Pages** are the HTML files in `docs/`. Nothing is published elsewhere.

Each project carries a copy, not a link, so `git pull` alone brings everything, every tool loads
it without fetching another repo, and a session needs no access beyond the project itself. The
copy is stamped with this repo's commit, and the project's doctor warns when a newer one exists.

It assumes a project on GitHub (agents use `gh` for PRs) with Node and a `package.json`, since
the doctor runs as `npm run doctor`.

## Day to day

- **Switching machine, account or tool:** in the project, run `git checkout main && git pull`,
  then start any agent there. It reads `AGENTS.md` and does the start-of-session steps itself:
  pull, `npm run doctor`, the open PRs and `STATUS.md`. You don't need to tell it any of this.
- **Switching mid-task:** nothing extra. The last agent kept its work in a draft PR with a
  Progress section, and the next one finds it among the open PRs.
- **A new machine:** follow the project's `docs/SETUP.md` once, until `npm run doctor` reports
  no `FAIL`.
- **A new tool:** nothing, if it reads `AGENTS.md`. If it reads only its own file, add that file
  with `@AGENTS.md` as its only line, as `CLAUDE.md` does. Don't put rules in it.
- **A decision:** tell the agent. It records it in the project's plan or decisions file and in
  `STATUS.md`, in its PR.
- **The doctor says the protocol changed:** update the project (below).

## Starting a new repo

You can hand this to an agent: "Make a new repo named `<name>` that follows
reannu123/agent-protocol; follow its README." It needs this repo checked out next to the new one.

1. From the folder that holds this repo's checkout, pull it, then create the new repo and clone
   it beside it:

   ```bash
   git -C agent-protocol pull --ff-only
   gh repo create reannu123/<name> --private --clone
   cd <name>
   ```

2. Copy the templates:

   ```bash
   cp ../agent-protocol/templates/{AGENTS.md,CLAUDE.md,STATUS.md} .
   mkdir -p docs && cp ../agent-protocol/templates/SETUP.md docs/SETUP.md
   ```

3. Fill them in, replacing every `<…>`:
   - `AGENTS.md`: what the repo is, where its plan and decisions live, what every PR keeps
     current, and its checks before a PR. Leave the two `agent-protocol` markers as they are;
     the sync fills the space between them.
   - `STATUS.md`: what's done (nothing yet) and the first step.
   - `docs/SETUP.md`: what this repo needs on a machine, such as its `.env`, services or another
     checkout.
   - The plan and decisions file `AGENTS.md` names, such as `docs/ROADMAP.md`.

4. Add Node, the doctor and the Node pin:

   ```bash
   npm init -y                                   # only if there's no package.json yet
   npm pkg set scripts.doctor="node scripts/doctor.mjs"
   echo 22 > .nvmrc                              # the Node version it builds and runs on
   ```

   Add the project's own doctor settings and checks if it needs them (see "Customizing the
   doctor").

5. Copy the protocol and the doctor in:

   ```bash
   node ../agent-protocol/scripts/sync.mjs .
   ```

6. Check it, then make the first commit. That one can go straight to `main`; after it, work goes
   through PRs as the protocol says.

   ```bash
   npm run doctor
   git add -A && git commit -m "Start the repo on the agent protocol"
   git branch -M main && git push -u origin main
   ```

   `git branch -M main` names the branch `main` even where git's default is still `master`.

7. Add the repo to "Projects that follow it" below, in a PR here.

## Adding it to an existing repo

The same steps as a new repo, in a PR that follows the repo's own rules, with these differences:

- Keep the existing `AGENTS.md`. Add the two markers near the top, after a short line on what
  the repo is:

  ```
  <!-- agent-protocol:start -->
  <!-- agent-protocol:end -->
  ```

  Then remove the rules the protocol now covers: checks at the start of a session, handing off
  work in progress, keeping status current, and publishing pages anywhere.
- Move any status block from `AGENTS.md` into `STATUS.md`. Replace what it says about other
  repos' progress with dated decisions and links.
- Make `CLAUDE.md`, `GEMINI.md` and any other tool file only `@AGENTS.md`.

## Updating a project to a newer protocol

When a project's doctor says the protocol changed, run this in that project:

```bash
git -C ../agent-protocol pull --ff-only
node ../agent-protocol/scripts/sync.mjs .
```

It replaces the block in `AGENTS.md` and `scripts/doctor.mjs`, and commits nothing. Commit the
two in a PR that follows the project's rules. Several projects can be updated in one run:
`node scripts/sync.mjs ../project-a ../project-b` from this repo.

## Changing the protocol

1. Change `PROTOCOL.md` or `scripts/doctor.mjs` here, in a PR, and merge it. The owner decides
   what the protocol says.
2. Update each project, as above. It can wait: until it's done, that project's doctor warns.

A change to this README, `templates/` or `scripts/sync.mjs` needs no project update.

## Customizing the doctor

`npm run doctor` runs `scripts/doctor.mjs`, the same in every project. A project adds to it in
two places.

**Settings, under `agentProtocol` in `package.json`:**

```json
"agentProtocol": {
  "docker": "optional",
  "dockerFor": "Docker Compose",
  "env": { "required": ["DATABASE_URL", "API_KEY|API_KEY_FILE"] }
}
```

- `docker`: `required` (a `FAIL` without it), `optional` (a `warn`) or `unused`, the default.
  `dockerFor` says what it's for.
- `env.required`: the names `.env` must set, where `A|B` means either. Without it, a missing
  `.env` is only a `warn`. The doctor also notes names in `.env` that `.env.example` doesn't have.

**Checks of its own, in `scripts/doctor.local.mjs`** (start from
[`templates/doctor.local.mjs`](templates/doctor.local.mjs)). It exports one function, which
gets:

- `ok`, `note`, `warn` and `fail`, each called as `(name, detail)` to report a result;
- `run(cmd, args, { timeout, cwd })`, which runs a command and returns `{ ok, out, err }`;
- `path(p)`, a path from the repo root;
- `readEnv(file)`, `.env` as a map of names to values;
- `ghReady`, whether `gh` is signed in.

`FAIL` means work can't go on and makes the doctor exit with 1. `warn` is something to fix, and
`note` is for information. Never report a secret's value.

## Projects that follow it

- [reannu123/agent-runtime](https://github.com/reannu123/agent-runtime)
- [reannu123/agent-workbench](https://github.com/reannu123/agent-workbench)
- [reannu123/sitenatin](https://github.com/reannu123/sitenatin)
