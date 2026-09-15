# The standard

Distilled from 22 of my own repos (CONCAT, FT, Makers, skills). Every rule here
exists because it is already written down in at least one of them and cost
something to learn; the _source_ line says where it lives today.

A rule earns its place when it appears in two or more repos **or** when its
absence already caused an incident. Everything else is local preference and
stays in its own repo.

Written in English, like everything in this repository: it is public.

---

## 1. The contract lives in one file

`AGENTS.md` at the root is the law of the repo. `CLAUDE.md` only references it —
it never restates a rule. If the file and the code disagree, the file wins: fix
the code.

What an `AGENTS.md` has to answer, in this order: repo map · sources of truth
ranked by authority · language policy · file naming · stack and commands · data
and auth · API contracts · git, PRs and who merges · agent roster · working
agreements.

Keeping it short is part of the contract: **every session pays for it in context.**

> Source: `Makers/emihs/AGENTS.md` (254 lines, the most complete one) · `FT/mcp` ·
> `Makers/ai-job-search` ("thin-pointer design").

## 2. Language: one layer, one language

| Layer | Language |
|---|---|
| Code: identifiers, props, types, comments | English |
| File and folder names, images included | English |
| Database: tables, columns, enums, migrations | English |
| Engineering docs: AGENTS.md, READMEs, ADRs, `route.md`, commits, PRs | English |
| Product copy, brand, `alt` text, URL slugs | Spanish (Colombia) |

English is not a per-repo choice. Anything that can be read by someone outside
the team — and in an open-source repo that is everything except the product copy —
is written in English.

Never mix inside one layer. No Spanish identifiers; no English marketing copy.

> Source: `Makers/emihs` §2.

## 3. File naming

kebab-case, lowercase, ASCII. No spaces, no accents, no `ñ`, no `&`. A `%20` in a
link is debt. Exceptions: `PascalCase.tsx` for components, `camelCase.ts` for
hooks and utils, and the names another tool fixes for us (`README.md`,
`AGENTS.md`, `CLAUDE.md`, `pull_request_template.md`, `CODEOWNERS`).

Always rename with `git mv`. macOS filesystems are case-insensitive: to change
only case, `git mv A tmp && git mv tmp a`.

Enforced by `./scripts/check-filenames.sh`, with the same debt-list ratchet as §4
when adopted into a repo that already has history.

> Source: `emihs` §3 and its `scripts/check-filenames.sh`.

## 4. Every public API ships its contract beside it

A route handler at `…/api/<name>/route.ts` **does not exist without its `route.md`**
next to it: method, path, auth, request shape, response shape, error codes, one
example. Colocated on purpose — documentation that lives elsewhere drifts.

Enforced by `./scripts/check-api-docs.sh`, and by a `PostToolUse` hook in
`.claude/settings.json` that stops an agent writing the route without the contract.

Scope: every surface someone else consumes — `/api/v1`, mobile endpoints, MCP
tools, CLI commands. Internal code does not pay this tax.

> Source: `emihs` §5 and its hook · `FT/free-admin` (30 `route.md` files across
> `/api/v1`, `/api/cron`, auth and webhooks).
> **Measured debt:** free-admin had 159 `route.ts` and 30 `route.md` when this was
> written. That is why the hook is part of the harness and not a good intention.

**Adopting it in a repo with history: ratchet, never a big bang.** A check that
fails on day one is a check everyone learns to ignore. The routes that predate the
rule go in `scripts/api-docs-debt.txt`; the check counts them, fails only for a
route that is neither documented nor listed, and tells you to delete a line once a
contract lands. The same shape works for `check-filenames.sh` with
`scripts/filenames-debt.txt`. **A debt list only ever gets shorter — never add a
line to one.**

## 5. Pull requests

**Every change is a branch and a PR.** `type/short-description`, from an
up-to-date `main`.

### The body

`.github/pull_request_template.md` is a contract, not a suggestion:

1. **The problem** — what was broken, missing or wrong *before*. The symptom, who
   hit it, what it cost. "There was no X" is a problem; "add X" is not.
2. **Why this solution** — plain human language, readable by someone who has never
   opened the code. What happens differently now, and which alternatives lost.
   Never a narration of the diff: the diff is already in the PR.
3. **Screenshots** — required when the change touches a screen. The states a
   reviewer cannot guess: empty, error, mobile. Otherwise "N/A".
4. **Architecture** — a `mermaid mindmap` whenever structure changes: new module,
   new dependency, new data flow, new boundary. Otherwise an explicit "N/A".
5. **Decisions** — one row per non-obvious call, with **who proposed it** and
   **who approved it**. The agent proposes; the approver is always a named human.
   An empty approver blocks the merge.

### Labels — mandatory, applied when the PR is opened

Exactly one type label (`type:feat` `type:fix` `type:docs` `type:chore`
`type:refactor`), plus every `area:*` the changed paths match.

Plus every risk label that applies — these are set by whoever opens the PR,
because they cannot be derived from the diff:

| Label | When | What it demands |
|---|---|---|
| `db-migration` | touches the schema or needs SQL in production | paste the exact SQL in a ```` ```sql ```` block. **Additive**: never `migrate dev` |
| `needs-env-var` | new variable | declare it in the env schema and load it in the host before merging |
| `needs-followup-pr` | the change is not complete on its own | describe the follow-up PR |
| `depends-on-pr` | cannot merge before another one | `owner/repo#N` in the body; **blocks until the label is removed** |
| `breaking-change` | breaks a public API, a contract or existing data | explain the compatibility plan |

No risk label means the change is self-contained and can be merged and deployed
on its own. Say so explicitly.

`.github/workflows/pr-labels.yml` applies what is derivable (paths → `area:*` via
the official labeler, Conventional Commits title → `type:*`) and demands the rest.
On a free org plan there are no required status checks or rulesets, so the
workflow **flips the PR to draft** — the only hard block available.

`.github/labels.yml` defines · `.github/labeler.yml` maps paths ·
`./scripts/sync-labels.sh` creates them on GitHub (idempotent).

In a repo whose labels already exist, `labels.yml` documents the live vocabulary
instead of replacing it — `boom-web` keeps its bare `feat`/`fix` names because a
year of PRs already carries them. Renaming a label is its own decision, not a
side effect of installing the harness.

> Source: `FT/v2` (template, workflow and policy) · `Makers/emihs` (body,
> `labels.yml`, `labeler.yml`, `CODEOWNERS`).

### Commits

Conventional Commits in the title. Subject in the imperative, 72 characters or
fewer, no trailing period. The body explains the *why* when it is not obvious.
One commit is one coherent change; never mix a mass rename with a content change.
Images and PDFs do not diff: commit final versions only.

Never push to `main`. Never merge your own PR. Never `--force` a shared branch.

### Who merges

One named owner, and `.github/CODEOWNERS` requests their review automatically.
In GitHub, once: require a PR · 1 approval · **require review from Code Owners** ·
dismiss stale approvals · block force pushes and deletions · apply to
administrators. Until that is on, "only X merges" is a habit, not a control.

> Source: `emihs` `docs/decisions/0003-pr-contract-and-merge-authority.md`.

## 6. Checks before opening the PR

Local first; CI when it exists. The one-liner lives in `AGENTS.md`:

```bash
./scripts/check-filenames.sh && ./scripts/check-api-docs.sh && ./scripts/check-secrets.sh && <lint> && <build>
```

When the repo has an end-to-end flow worth verifying (server, routes,
integrations), it gets a `scripts/harness.sh`: one pass that boots the build,
hits every surface and reports `PASS` / `FAIL` / `BLOCKED` — **`BLOCKED` is a
missing credential or external config, not a bug.** Run it in a loop until green.

> Source: `emihs/scripts/check-*.sh` · `CONCAT/open-ticket/scripts/harness.sh`.

## 7. Secrets

No `.env` is ever tracked, placeholders included. `./scripts/check-secrets.sh`
scans everything git would let you commit: Postgres URLs with a real password,
`sk-…` provider keys, `eyJ…` JWTs, auth secrets with a value, and service-role
keys referenced from application code, where they defeat every tenant boundary.

> Source: `emihs/scripts/check-secrets.sh` (SEC-06).

## 8. Versioning and changelog

After any functional change to published code, **before closing the task**:

1. Bump SemVer in `package.json` — *patch*: bugfix or internal refactor;
   *minor*: new tool, route, field or optional env var; *major*: renaming or
   removing something public, changing the shape of a response, a new required
   env var.
2. An entry in `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD` with
   `Added` / `Changed` / `Fixed` / `Removed`.
3. The version is read from `package.json`, never hardcoded anywhere else.
4. Docs-only changes need no bump.

Where something is published (npm, a CLI), `release-please` automates it.

> Source: `FT/mcp/CLAUDE.md` · `FT/freeticket-cli` · `FT/free-admin`.

## 9. Agents

- Project agents live in `.claude/agents/` — **project scope, never
  `~/.claude/agents/`**: those pollute other repos and their memory bleeds across.
- `AGENTS.md` carries a **task → agent router**. Delegation is **by domain, not by
  size**: if the task matches a row, it goes to that agent.
- The main thread implements directly only when all three hold: the task matches
  no row, it touches three files or fewer, and it has already read that code this
  session. Re-exploring the repo from scratch inside a subagent costs more context
  than it saves.
- Independent tasks run in parallel: one message, several `Agent` calls.
- Missing agents are declared with the trigger that would create them
  ("`security-reviewer`: mandatory before any personal data ships"). Nobody adds
  one on their own.
- Definitions are read when the session starts: editing frontmatter does nothing
  to a running session. Restart, or do that part yourself.

> Source: `FT/free-admin` (a 16-row router) · `emihs` §8 · `FT/ai-native`.

## 10. Memory

Persist decisions, conventions and non-obvious discoveries — and check what is
already there before redoing the analysis. Memory is for decisions and their
reasons, not for what the code already states.

> Source: `emihs` §9 (engram over MCP, the CLI as fallback).

## 11. Stack defaults

- **Next.js**: the installed version has breaking changes against what the model
  memorized. Read `node_modules/next/dist/docs/` before writing. Do not guess.
- **Backticks inside a template literal** (GLSL, colocated CSS) are banned, comments
  included. They close the string and take the whole project's parse down with them.
  It has happened four times in `lucas-leguizamo`.
- **pnpm**, one lockfile. Server Components by default; `"use client"` only for
  state, effects or browser APIs, as deep in the tree as possible.
- No new dependency for what the platform, CSS, or an installed package already
  does. Justify every addition in one line in the PR.
- Design tokens in a single file; a new colour becomes a token, never a hardcoded
  value in a component.
- Images: the framework's image component, never `<img>`; WebP; explicit
  `width`/`height`; `priority` only above the fold; a real `alt`.
- Accessibility is not optional: semantic HTML, AA contrast, visible focus,
  `prefers-reduced-motion`.
- `biome` as the default linter and formatter (already in 11 repos).
- A check the repo cannot pass today does not get installed silently: either it is
  a ratchet with its debt list, or its failure is reported and left visible. Never
  weaken a check to make a green run.

> Source: `AGENTS.md` of `free-admin`, `free-api`, `makers-studio` and
> `lucas-leguizamo` · `emihs` §4.

## 12. The product's source of truth

When the backlog lives outside the repo (Notion), it has **a single writer** — one
dedicated agent. Nobody else edits rows by hand: the single writer is what keeps
the repo and the backlog from drifting apart.

The task ID is immutable and is the join key between a branch, a commit, a PR and
its row. A row is `Done` when the code exists, the checks pass, and the evidence
names the PR, ADR, migration or test that proves it. "Done" is not evidence.

Where they disagree: **the repo wins on implementation state, the backlog wins on
product scope.** Report the contradiction instead of resolving it silently.

Architecture decisions go to `docs/decisions/NNNN-title.md` (ADRs), and the PR
that takes one references it.

> Source: `emihs` §1 and its `docs/decisions/` · `free-admin` (Notion cards).
