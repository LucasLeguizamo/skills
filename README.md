# skills

Skills, agents and an engineering standard by
[Lucas Leguizamo](https://lucasleguizamo.com) — packaged so **any** coding agent
can install them, not only Claude Code.

The skills live in exactly one place, `plugins/lucas-leguizamo-skills/skills/`.
Each harness gets a thin manifest that points at that directory; nothing is ever
copied or duplicated. Adding support for another agent means adding a manifest.

They are written in English so anyone can read and fork them, and they keep their
Spanish trigger phrases: Lucas works in Spanish, so both languages have to fire
the same skill.

## Install

| Harness | How | Manifest |
|---|---|---|
| **Claude Code** | `/plugin marketplace add lucasleguizamo/skills` then `/plugin install lucas-leguizamo-skills@lucas` | `.claude-plugin/marketplace.json` |
| **Codex** | point Codex at this repo as a plugin source | `.codex-plugin/plugin.json` |
| **Cursor** | point Cursor at this repo as a plugin source | `.cursor-plugin/plugin.json` |
| **Devin** | point Devin at this repo as a plugin source | `.devin-plugin/plugin.json` |
| **Gemini CLI** | install as an extension; context comes from `GEMINI.md` | `gemini-extension.json` |
| **Anything else** | clone the repo and point the agent at `plugins/lucas-leguizamo-skills/skills/` | `.agents/plugins/marketplace.json` |

Update on Claude Code with `/plugin update lucas-leguizamo-skills`.

The manifest shapes for the non-Claude harnesses are mirrored from
[obra/superpowers](https://github.com/obra/superpowers), which ships one skills
directory to nine of them. They have not been verified against each vendor's own
documentation — if a harness rejects one, the fix belongs here.

Every manifest carries the same version, listed in `.version-bump.json`:
`./scripts/bump-version.sh <version>` moves them together and
`./scripts/check-versions.sh` fails when one drifts.

## What `lucas-leguizamo-skills` ships (v0.2.0)

### Skills

| Skill | What it does | Triggers on |
|---|---|---|
| `graphify` | Turns any input — code, docs, papers, images, video — into a persistent knowledge graph with god nodes, community detection and query/path/explain tools | "how does this codebase fit together", `/graphify` · cómo se relaciona esto, qué hace este proyecto |
| `concat-content` | SEO blog articles for CONCAT as JSX ready for `lib/blog-posts.tsx`, plus the cover-image prompt. Articles are written in Spanish | "write a post", "create a blog article", "what post is next" · escribe un post, crea un artículo para el blog, qué post sigue |
| `pm-agent` | Product discovery through `AskUserQuestion` → vision, prioritized backlog, PRD or sprint plan | "write me a PRD", "build the backlog", "prioritize these features" · hazme un PRD, arma el backlog, prioriza estas features |
| `whiteboard` | Diagrams, flows and wireframes in Excalidraw style, generated from code and published to a private site (nginx + TLS + secret-token URL) | "make me a diagram", "draw the flow", "publish it on a page" · hazme un diagrama, dibuja el flujo, publícalo en una página |

### Agents

The twelve that build, review and QA [lucasleguizamo.com](https://lucasleguizamo.com).
They are written for that repo, but the split is the point: art direction
decides, the guardian enforces, QA proves.

| Agent | Role |
|---|---|
| `art-director` | Writes the visual law: palette, materials, texture, type scale, what the first screen leads with |
| `design-guardian` | Enforces it — reviews a diff against `DESIGN.md` before anything user-visible merges |
| `webgl-motion` | The global WebGL stage: the fluid field, the composite pass, the DOM↔plane sync, the GPU budget and the gating |
| `qa-verifier` | Browser-level QA after a change lands: both locales, both viewports, console and network clean, proof screenshots |
| `bug-hunter` | Reproduces, fixes and *proves* a bug is gone. Leaves no unapplied findings |
| `perf-optimizer` | Core Web Vitals, media weight, bundle analysis |
| `seo-portfolio` | SEO + GEO: metadata, schema, hreflang, AI-citability, personal-brand entity SEO |
| `content-i18n` | Every user-facing string, shipped in Spanish *and* English in the same change |
| `site-ripper` | Reverse-engineers a URL into a SPEC of tokens, grid, motion and copy |
| `site-rebuilder` | Turns that SPEC into real code, adapted to the target repo's design system |
| `skillsmith` | Authoring and curation of skills, agents and plugins against the marketplace standard |
| `skills-cli` | Builds the `lucasleguizamo` CLI (Node 24 + TypeScript, zero runtime dependencies) |

Third-party skills installed in `~/.claude` are deliberately **not** vendored
here — the manifest records where each one came from, and `lucasleguizamo
export` only publishes what is tagged `mine`.

## The CLI

`cli/` is the `lucasleguizamo` package, binary `lucasleguizamo`: zero runtime
dependencies, Node 24+, MIT. Full docs in [`cli/README.md`](cli/README.md);
`lucasleguizamo --help` is the reference.

```
npm i -g lucasleguizamo
```

```
lucasleguizamo init                 scans ~/.claude and generates the manifest
lucasleguizamo list [--json]        skills, agents, plugins, hooks and MCP with origin and version
lucasleguizamo export [--out f]     emits registry.json for lucasleguizamo.com/stack
lucasleguizamo new <skill|agent|plugin> <name>
```

`add`, `remove`, `sync` and `doctor` land in phase 3: today they print "not
implemented yet" and exit with code 1.

The manifest `~/.claude/skills.json` is the source of truth and is tracked in
git. `registry.json` at the root of this repo is generated by `lucasleguizamo export`
and contains only what is tagged `mine`: its schema is the contract with the
portfolio site and is documented in `cli/README.md`.

Every description is written in English in its own frontmatter, the single
source of truth. The Spanish for the website lives in one file, `i18n/es.json`
(slug → `summary` / `whenToUse`), and `lucasleguizamo export` merges the two into
`{ en, es }`. A missing translation is never an error: the English is used.

## Curation

`audit.md` classifies everything in `~/.claude` as `mine` (own work, ships in
the plugin), `vendor` (third-party, documented only so it can be reinstalled)
or `dead` (deletion candidate). Nothing third-party is republished here: the
original marketplace is referenced instead.

## License

MIT © 2026 Lucas Leguizamo
