# Setting up a machine

What a machine needs before an agent can work on this repo. Secrets and local data stay on each
machine and never go in git: make them here, once per machine.

## Once per machine

1. Install git (with `git config --global user.name` and `user.email` set), the GitHub CLI
   (`gh auth login`), and Node at the version in `.nvmrc` (`nvm install && nvm use`).
2. Clone the repo, then run `npm ci`.
3. <Copy `.env.example` to `.env` and fill in what it needs, and say where each value comes from.>
4. <Anything else: Docker, local data, a sibling checkout.>
5. Run `npm run doctor`. It says what is still missing.

## Every time you switch to this machine

```bash
git checkout main && git pull
```

The agent does the rest at the start of its session (the agent protocol in `AGENTS.md`), including
`npm run doctor`. Run `npm ci` when the doctor says `package-lock.json` changed.
