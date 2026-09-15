# AGENTS.md — the skills repo

Lucas Leguizamo's skills, agents and engineering standard, packaged so **any**
coding agent can install them — not only Claude Code.

This file is the contract. Every harness-specific file in this repo
(`CLAUDE.md`, `GEMINI.md`, the `.*-plugin/` manifests) points back here instead
of restating anything.

## 1. Repo map

```
skills/
├── plugins/lucas-leguizamo-skills/
│   ├── skills/          the skills themselves — one folder, one SKILL.md
│   ├── agents/          subagent definitions, one .md each
│   └── .claude-plugin/  plugin.json
├── .claude-plugin/      marketplace.json — Claude Code's entry point
├── .agents/plugins/     marketplace.json — harness-neutral descriptor
├── .codex-plugin/       manifests, one per harness: they only point at the
├── .cursor-plugin/      skills directory above, they never copy it
├── .devin-plugin/
├── gemini-extension.json + GEMINI.md
├── cli/                 the `lucasleguizamo` CLI (Node 24, zero runtime dependencies)
├── registry.json        generated feed for lucasleguizamo.com/stack
├── i18n/es.json         Spanish summaries for that feed
└── scripts/             the repo's own checks
```

**One source, many manifests.** The skills live in exactly one place. A harness
is added by writing a manifest that points at that path — never by copying the
skills, and never by a symlink that half the tools cannot follow.

## 2. Language

| Layer | Language |
|---|---|
| Skills, agents, docs, code, commits, PRs | English |
| Trigger phrases inside a skill description | English **and** Spanish |
| `i18n/es.json` summaries for the website | Spanish |

The repo is public, so everything readable is English. The one deliberate
exception is trigger phrases: Lucas works in Spanish and both languages have to
fire the same skill, so a description carries "write me a PRD" *and* "hazme un
PRD".

## 3. File naming

kebab-case, lowercase, ASCII. A skill folder is its own name: `skills/<name>/SKILL.md`,
and `name:` in the frontmatter matches the folder. Enforced by
`./scripts/check-filenames.sh`.

## 4. pnpm, always

**pnpm is the package manager. Never npm, never yarn.** One lockfile is the
source of truth for what actually gets installed; a second one from another tool
resolves different versions of the same tree, and the one that wins is whichever
command the next person happens to type. `./scripts/check-package-manager.sh`
fails on a tracked `package-lock.json` or `yarn.lock`, and on a `package.json`
script that calls `npm run` or `yarn`.

Converting an existing project: `pnpm import` reads the npm lockfile and writes
`pnpm-lock.yaml`, then the old lockfile is deleted in the same commit.

## 5. Adding or changing a skill

A skill is one folder with `SKILL.md` — YAML frontmatter with `name` and
`description`, then the body. Everything else it needs (`references/`,
`templates/`, scripts) lives beside it.

The `description` is the only thing a harness reads to decide whether to load
the skill, so it says **what it does and when to fire**, with both languages'
triggers. A description that does not name a trigger is a skill nobody invokes.

Before committing a change to a skill or an agent:

```bash
node cli/dist/index.js export     # regenerate registry.json
./scripts/check-versions.sh       # every manifest carries the same version
./scripts/check-filenames.sh
./scripts/check-secrets.sh
./scripts/check-package-manager.sh
cd cli && pnpm test
```

## 6. Supporting another harness

Add a manifest; do not move the skills. Each one declares the same three
things — name, version, and the path to `plugins/lucas-leguizamo-skills/skills/`.

Then add its version field to `.version-bump.json`, so one bump moves every
manifest at once and `./scripts/check-versions.sh` fails when one drifts. A
manifest that is not listed there will silently fall behind.

The manifest shapes are mirrored from
[obra/superpowers](https://github.com/obra/superpowers), which ships the same
skills to nine harnesses. They are not verified against each vendor's own
documentation — when a harness rejects one, fix it here and say so in the PR.

## 7. Versioning

One version for the whole repo, carried by every manifest. `./scripts/bump-version.sh <version>`
writes it everywhere listed in `.version-bump.json`; `./scripts/check-versions.sh`
proves they agree. Bump when a skill's behaviour changes, not for a typo.

## 8. Git and PRs

Everything is a branch and a PR: `type/short-description`, from up-to-date `main`.

- Conventional Commits title. Subject in the imperative, ≤72 chars, no period.
- One commit, one coherent change. Never push to `main` directly.

`.github/pull_request_template.md` is the contract for the body: the problem ·
why this solution · screenshots · architecture · decisions with a named human
approver. Labels are applied when the PR is opened: one `type:*` plus every
`area:*` the changed paths match.

## 9. The standard this repo also publishes

`plugins/lucas-leguizamo-skills/skills/harness/` is the engineering standard
Lucas installs into every other repo — `STANDARD.md` is the law and `init.sh`
installs it. This repo follows it too: its `AGENTS.md`, PR template, labels and
checks were installed by that same script.

## 10. Working agreements

- This file is the contract. Harness files point here; do not duplicate rules.
- **Missing config**: look here first; if the answer is not here, ask, then
  write the answer back into this file.
- Never commit or push unless asked. Never commit `.env` or keys.
- Report what you verified and what you did not. "It passes" means you ran it.
