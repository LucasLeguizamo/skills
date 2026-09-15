---
name: harness
description: Installs and audits an engineering standard for teams building with AI agents — AGENTS.md as the single contract every harness reads (Claude Code, Codex, Cursor, Gemini), a colocated contract for every public API, a mandatory PR template with a named human approver, labels, runnable checks for filenames, secrets, package manager and API docs, SemVer plus CHANGELOG, an agent delegation router and engram for memory. Adopts into repos with history through a debt-list ratchet. Use it when starting a new project or repo, adopting or auditing an existing one, setting up agent guardrails, writing or fixing AGENTS.md or CLAUDE.md, defining a PR contract or branch protection, or when the user says "harness", "initial setup", "the standard", "my conventions", "best practices", "set up the repo", "agent rules", "arnés", "setup inicial", "mi estándar", "mis convenciones", "buenas prácticas", "reglas para los agentes" — or when a repo has no AGENTS.md, no PR template, or rules nobody can run.
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
