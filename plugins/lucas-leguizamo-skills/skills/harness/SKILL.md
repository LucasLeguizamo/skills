---
name: harness
description: Installs and audits Lucas Leguizamo's engineering standard in any repo — AGENTS.md as the contract, a colocated contract for every public API, a mandatory PR template and labels, local checks before the PR, SemVer plus CHANGELOG, and an agent roster. Use it when starting a new project, adopting an existing repo, when the user says "harness", "initial setup", "the standard", "my conventions", "arnés", "mis convenciones", or when a repo has no AGENTS.md or pull request template.
---

# harness — the initial setup

`STANDARD.md`, next to this file, is the law. This skill only installs and audits it.

## Install into a repo

```bash
skills/harness/init.sh <repo-path>        # idempotent; never overwrites what exists
skills/harness/init.sh <repo-path> --dry-run
```

It leaves: `AGENTS.md` (the contract), `CLAUDE.md` and `GEMINI.md` (pointers), `.github/`
(PR template, `labels.yml`, `labeler.yml`, the `pr-labels` workflow),
`scripts/check-*.sh`, `scripts/sync-labels.sh`, and — only if absent —
a `.claude/settings.json` carrying the hook that blocks an API route with no
contract, plus a `.mcp.json` wiring engram as the repo's memory.

Then **fill in the `<TODO>`s in `AGENTS.md`** with what the repo actually is: folder
map, stack, commands, sources of truth, agent roster. A contract with `<TODO>` in it
is a contract nobody follows.

With `gh` authenticated, `./scripts/sync-labels.sh` creates the labels on GitHub.

## Audit a repo

```bash
skills/harness/init.sh <repo-path> --check   # lists what is missing, exits 1 if anything is
```

## Rules for using it

- Everything here ships publicly, so **everything here is written in English** —
  the templates included. Product copy is the one layer that stays Spanish.
- Never duplicate a rule: `AGENTS.md` rules, `CLAUDE.md` only points at it.
- When a repo already has a different, deliberate convention, the repo wins —
  write it into its `AGENTS.md` instead of forcing the template over it.
- An unresolved `<TODO>` or a check nobody runs is debt. Say so in the report.
