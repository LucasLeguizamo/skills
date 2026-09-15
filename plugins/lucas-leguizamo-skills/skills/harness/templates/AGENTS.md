# AGENTS.md — <PROJECT> engineering contract

Rules for everyone working here, human or agent. If this file and the code
disagree, this file wins — fix the code.

Keep this document lean. Every session pays for it in context.

## 1. Repo map

```
<TODO: one level of the tree, one line per folder, what each one is>
```

Sources of truth, in order of authority:

1. <TODO>
2. <TODO>

Backlog and product scope: <TODO: link, or "this file">.
The repo wins on implementation state; the backlog wins on product scope.
A contradiction gets reported, not silently resolved.

## 2. Language

| Layer | Language |
|---|---|
| Code: identifiers, props, types, comments | English |
| File and folder names | English |
| Database: tables, columns, enums, migrations | English |
| Engineering docs, `route.md`, commits, PRs | English |
| Product copy, brand, `alt` text, URL slugs | Spanish (Colombia) |

Never mix inside one layer.

## 3. File naming

kebab-case, lowercase, ASCII. No spaces, no accents, no `ñ`, no `&`.
Exceptions: `PascalCase.tsx` for components, `camelCase.ts` for hooks and utils,
and the names another tool fixes for us (`README.md`, `AGENTS.md`, `CLAUDE.md`,
`pull_request_template.md`, `CODEOWNERS`).

Rename with `git mv`. On macOS, to change only case:
`git mv A tmp && git mv tmp a`.

Enforced by `./scripts/check-filenames.sh`.

## 4. Stack and commands

<TODO: the stack in one line>

**pnpm is the package manager. Never npm, never yarn** — one lockfile,
`pnpm-lock.yaml`, is what CI and the host install from. Enforced by
`./scripts/check-package-manager.sh`.

```bash
<TODO: dev>
<TODO: lint>
<TODO: build>
```

- No new dependency for what the platform, CSS, or an installed package already
  does. Justify every addition in one line in the PR.
- Design tokens live in <TODO: file>. A new colour becomes a token, never a
  hardcoded value.
- Images: WebP, through the framework's image component, explicit `width`/`height`,
  a real `alt`.
- Accessibility: semantic HTML, AA contrast, visible focus, `prefers-reduced-motion`.

## 5. Data and auth

<TODO: where the database lives, how it is migrated, what tenant boundary exists,
which credential must never be used from the application. Delete this section if
it does not apply.>

## 6. Public APIs

Every surface someone else consumes — `/api/...`, MCP tools, CLI commands —
**ships its contract beside it**: `route.ts` → `route.md` with method, path, auth,
request shape, response shape, error codes and one example. Colocated on purpose:
documentation that lives elsewhere drifts.

Enforced by `./scripts/check-api-docs.sh`, and by the `PostToolUse` hook in
`.claude/settings.json` that stops an agent writing a route without its contract.

## 7. Versioning

After any functional change to published code, before closing the task: bump
SemVer in `package.json` (*patch* bugfix · *minor* new surface · *major* breaks
something public) and add an entry to `CHANGELOG.md` under
`## [x.y.z] - YYYY-MM-DD` with `Added` / `Changed` / `Fixed` / `Removed`. The
version is read from `package.json`, never hardcoded. Docs-only changes need no bump.

## 8. Git and PRs

Everything is a branch and a PR: `type/short-description`, from up-to-date `main`.

- Conventional Commits title. Subject in the imperative, ≤72 chars, no period.
- One commit is one coherent change. Never mix a mass rename with content.
- Never push to `main`. Never merge your own PR. Never `--force` a shared branch.

`.github/pull_request_template.md` is the contract for the body and is not
optional: the problem · why this solution · screenshots · architecture (mermaid) ·
decisions with a proposer and a **named human approver**.

**Labels, applied when the PR is opened**: exactly one `type:*`, every `area:*`
the changed paths match, and every risk label that applies (`db-migration`,
`needs-env-var`, `needs-followup-pr`, `depends-on-pr`, `breaking-change`).
Definitions in `.github/labels.yml`, path mapping in `.github/labeler.yml`,
`./scripts/sync-labels.sh` creates them on GitHub.

Before opening a PR:

```bash
./scripts/check-filenames.sh && ./scripts/check-api-docs.sh && ./scripts/check-secrets.sh && ./scripts/check-package-manager.sh && <TODO: lint && build>
```

**Who merges: <TODO: name>.** Branch protection on `main`: require a PR ·
1 approval · require review from Code Owners · dismiss stale approvals · block
force pushes and deletions · apply to administrators.

## 9. Agent roster

They live in `.claude/agents/` — project scope, never `~/.claude/agents/`.
Delegation is **by domain, not by size**.

| Task | Agent |
|---|---|
| <TODO> | <TODO> |
| Finding and reading code (read-only) | `Explore` |
| Anything else multi-step | `general-purpose` |

The main thread implements directly only when all three hold: the task matches no
row, it touches three files or fewer, and it has already read that code this session.

Deliberately missing, each with its trigger: <TODO>.

## 10. Working agreements

- This file is the contract. `CLAUDE.md` only points here; do not duplicate rules.
- **Missing config**: look here first; if the answer is not here, ask with
  `AskUserQuestion` and **write the answer back into this file**.
- **Memory**: persist decisions and non-obvious discoveries, and check what is
  already there before redoing analysis. Decisions and their reasons — not what
  the code already states.
- Never commit or push unless asked. Never commit `.env` or keys.
- Report what you verified and what you did not. "The build passes" means you ran it.
