# `lucasleguizamo`

A CLI to inventory, version and reinstall a Claude Code setup: skills, agents,
plugins, hooks and MCP servers.

Zero runtime dependencies. Node 24+. TypeScript compiled with `tsc`, no
bundler. Every command supports `--json`, respects `NO_COLOR`, and never
writes over `~/.claude` without leaving a backup first.

```
npm i -g lucasleguizamo
skills --help
```

## Commands

| Command | Status | What it does |
|---|---|---|
| `lucasleguizamo init [--dry-run]` | ✅ | scans `~/.claude` and generates the manifest |
| `lucasleguizamo list [--type t]` | ✅ | inventory of this machine, with origin, version and tag |
| `lucasleguizamo export [--out f]` | ✅ | emits `registry.json` for lucasleguizamo.com/stack |
| `lucasleguizamo new <skill\|agent\|plugin> <name>` | ✅ | scaffolding that follows the marketplace standard |
| `lucasleguizamo add <source>` | ⏳ | install a GitHub skill or a marketplace plugin |
| `lucasleguizamo remove <name>` | ⏳ | uninstall |
| `lucasleguizamo sync [--dry-run]` | ⏳ | apply the manifest to this machine |
| `lucasleguizamo doctor` | ⏳ | validate frontmatter, duplicates, paths and versions |

The ⏳ ones exist as commands: they print "not implemented yet" and exit with
code 1.

`--help` is the documentation. If anything in this README does not show up in
`lucasleguizamo <command> --help`, the README is the one that is wrong.

## The manifest: `~/.claude/skills.json`

The source of truth, meant to be tracked in git and carried between machines.
`init` generates it by reading, without modifying:

| File | What it contributes |
|---|---|
| `~/.claude/skills/*/SKILL.md` | standalone skills and their frontmatter |
| `~/.claude/agents/*.md` | user subagents |
| `~/.claude/plugins/installed_plugins.json` | plugins, version, scope and commit |
| `~/.claude/plugins/known_marketplaces.json` | declared marketplaces |
| `~/.claude/settings.json` | hooks, enabled plugins and MCP servers |
| `~/.agents/.skill-lock.json` | the origin repo of each skill: the authorship evidence |

Shape:

```jsonc
{
  "version": 1,
  "generatedAt": "2026-08-22T03:16:19.073Z",
  "exclude": ["mcp:n8n"],
  "marketplaces": { "<name>": { "tag", "sourceType", "origin", "ref?", "install" } },
  "plugins":      { "<plugin@marketplace>": { "tag", "marketplace", "plugin", "version",
                                              "scope", "commit", "enabled", "install" } },
  "skills":       { "<name>": { "tag", "sourceType", "origin", "sourceUrl?", "skillPath?",
                                "description?", "version?", "installedAt?", "updatedAt?", "note?" } },
  "agents":       { "<name>": { "tag", "sourceType", "origin", "description?", "model?", "tools?", "note?" } },
  "hooks":        [ { "event", "matcher?", "type", "command", "timeout?" } ],
  "mcpServers":   { "<name>": { "transport", "command?", "args?", "url?", "envKeys", "from" } }
}
```

### Tags

| Tag | Meaning |
|---|---|
| `mine` | own work: ships in the plugin and gets published on the website |
| `vendor` | third-party: declared only so it can be reinstalled |
| `unknown` | no authorship evidence; a human resolves it |

The classification is derived from the lockfile (`~/.agents/.skill-lock.json`):
anything that came from someone else's repo is `vendor`. The human verdicts in
`audit.md` are used as the seed. **A tag you edit by hand wins**: `init` keeps
it.

### `exclude`: what is not managed yet

```jsonc
"exclude": ["mcp:n8n", "skill:one-i-dont-want"]
```

An array of items that stay out of everything: they never enter the manifest,
never show up in `list` and are never exported. Each entry is `<type>:<name>` —
valid types are `skill`, `agent`, `plugin`, `marketplace`, `mcp` — or a bare
name, which switches off anything with that name regardless of type.

- `init` **seeds** it the first time (today: the `n8n` MCP server) and then
  **never touches it again**: the order and the contents are yours.
- If `init` finds an excluded item again, it silently leaves it out; it only
  reports how many items were left out.
- `list` and `export` do the same: one line with the count, no names. If it is
  not managed, it is not listed.
- To manage something again, delete its line from the array and run `init`.

### What `init` guarantees

- **Idempotent.** If the manifest already matches the machine, it writes
  nothing and says so.
- **Non-destructive.** Derived data is refreshed; your `tag` and your own keys
  (`note`, …) survive the merge.
- **Portable.** Anything declared in the manifest but missing from this machine
  is not deleted: `sync` will need it. It is reported as `removed-from-disk`.
- **Backed up.** Before overwriting, the previous file is copied to
  `~/.claude/.skills-backup/<timestamp>/`.
- **No secrets.** For MCP servers it stores the NAMES of the environment
  variables, never their values.
- `--dry-run` prints the diff and touches nothing.

## The `registry.json` contract

`lucasleguizamo export` walks the repo's marketplace (`.claude-plugin/marketplace.json`)
and its plugins, and emits a JSON file containing **only what is tagged `mine`**
and not switched off by `exclude`. It is what `lucasleguizamo.com/stack` consumes to generate static
pages, so the schema is a contract: breaking it breaks the website.

```jsonc
{
  "version": 2,
  "generatedAt": "2026-08-22T03:04:33.000Z",
  "marketplace": { "name": "lucas", "install": "/plugin marketplace add lucasleguizamo/skills" },
  "items": [
    {
      "slug": "whiteboard",
      "type": "skill",
      "name": "whiteboard",
      "summary": {
        "en": "Draws flows, diagrams, wireframes and architecture maps in FigJam/Excalidraw style from Python",
        "es": "Dibuja flows, diagramas, wireframes y mapas de arquitectura estilo FigJam/Excalidraw desde Python"
      },
      "whenToUse": {
        "en": "Use when the user asks for a diagram, a flow, a wireframe…",
        "es": "Úsala cuando el usuario pida un diagrama, un flujo, un wireframe…"
      },
      "category": "productivity",
      "source": "https://github.com/lucasleguizamo/skills/blob/main/plugins/lucas-leguizamo-skills/skills/whiteboard/SKILL.md",
      "install": "/plugin install lucas-leguizamo-skills@lucas",
      "version": "0.1.1",
      "updatedAt": "2026-08-22T03:04:33.000Z"
    }
  ]
}
```

| Field | Rule |
|---|---|
| `slug` | unique across the file; it is the `/stack/<slug>` URL. On a collision the type is prefixed |
| `type` | `skill` · `agent` · `plugin` |
| `name` | the frontmatter `name` (or the one in `plugin.json`) |
| `summary` | `{ en, es }`. One line, no trailing period: the first sentence of the `description` |
| `whenToUse` | `{ en, es }`. The trigger: everything from "Use when… / Úsala/Úsalo/Invócalo cuando…" to the end |
| `category` | frontmatter `category`, falling back to the plugin's category in the marketplace |
| `source` | URL of the file on GitHub (`SKILLS_REF` changes the branch, `main` by default) |
| `install` | a command you can copy as is |
| `version` | version of the plugin that packages it |
| `updatedAt` | date of the last commit that touched the file; without git, its `mtime` |

The `<example>` blocks of the agents are **not** included: `summary` and
`whenToUse` come out clean.

### Both languages: `summary` and `whenToUse` are `{ en, es }`

The website is bilingual, so since **version 2** the two prose fields are
objects instead of strings. Everything else in the file is unchanged.

**English is the single source of truth and stays in the frontmatter.** It is
the standard plugin format, so no new keys are invented there: `en` is still
derived from the same `description` as before.

**Spanish lives in one file**, `i18n/es.json` at the root of this repo, a flat
map from slug to the two fields, both optional:

```jsonc
{
  "whiteboard": {
    "summary":   "Dibuja flows, diagramas, wireframes y mapas de arquitectura…",
    "whenToUse": "Úsala cuando el usuario pida un diagrama, un flujo…"
  },
  "lucas-leguizamo-skills": { "summary": "Skills y agentes de autoría propia de Lucas Leguizamo…" }
}
```

**It always falls back to English, it never fails.** If the slug is missing, if
one of the two fields is missing, if the file does not exist or is not even
valid JSON, `es` gets the English text and the export carries on. The web never
sees an empty field. Each gap is reported at the end of the run and listed
under `missingEs` in `--json`, as `<slug>.<field>` — a field whose English is
empty (the plugin has no trigger) is not a gap.

Lookup is by `slug` and, failing that, by `name`: an item renamed by a slug
collision keeps its translation.

Descriptions in the frontmatter are written in English and keep their Spanish
trigger phrases, so `whenToUse.en` usually carries both languages; `es` mirrors
that with Spanish first. The parser accepts either opener.

`generatedAt` is the most recent `updatedAt`, not the wall clock: exporting
twice on the same commit produces identical bytes and does not dirty the diff.

Items come sorted by `type` and then by `slug`. An item drops out of the
registry for two reasons: the manifest downgraded it to `vendor` or `unknown`
(the command names those under `excluded`), or it is listed in `exclude` (those
are only counted, under `excludedByRule`).

## `lucasleguizamo new`

```
skills new skill  my-skill     # <base>/skills/my-skill/SKILL.md
skills new agent  my-agent     # <base>/agents/my-agent.md
skills new plugin my-plugin    # <base>/my-plugin/.claude-plugin/plugin.json + skills/ + agents/
```

Default base: `plugins/lucas-leguizamo-skills/` of the marketplace repo you are standing
in; with no repo, `~/.claude/`. `--out` forces it.

The templates already carry the standard: `name` in kebab-case identical to the
directory, a third-person `description` that says **what it does and when it
fires**, and for agents two `<example>` blocks plus `tools`. Everything else is
a `TODO:` to fill in.

**It never overwrites.** If the destination exists, it exits with code 1
without touching anything.

## Development

```
npm install
npm run build      # tsc → dist/
npm test           # build + node --test (no frameworks)
```

Handy variables for testing without touching your machine:

| Variable | What it is for |
|---|---|
| `SKILLS_CLAUDE_HOME` | point at a fake `~/.claude` |
| `SKILLS_AGENTS_HOME` | point at a fake `~/.agents` |
| `SKILLS_REPO` | force the marketplace repo root |
| `SKILLS_REF` | branch used for the `source` URLs in the registry |
| `NO_COLOR` | turn off the ANSI |

## License

MIT © 2026 Lucas Leguizamo
