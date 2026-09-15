# Audit of `~/.claude` — 2026-08-21

Scope: the 26 skills in `~/.claude/skills/` and the 4 agents in
`~/.claude/agents/`. `~/.claude` was read without being modified: everything
migrated is a **copy**.

## Method

- **Authorship.** `~/.agents/.skill-lock.json` records the origin repo of every
  skill installed with `npx skills add`. That lockfile is the hard evidence: 22
  of the 26 come from third-party repos. The remaining 4 (3 real directories +
  1 symlink into `~/Developer`) were reviewed by hand, looking for author,
  license, language and references to Lucas's own projects.
- **Usage.** Real invocations (`"skill":"<name>"` and
  `"subagent_type":"<name>"`) were counted across the 1,134 transcripts in
  `~/.claude/projects`. **Known limit:** the corpus only covers 2026-07-22 →
  2026-08-21 (~30 days); older transcripts are gone. That is why the 90-day
  rule cannot be certified.
- **Notation.** `dead?` = zero invocations inside the available window. It is a
  deletion candidate, not a verdict: confirm with Lucas, or wait until
  `skills doctor` has accumulated 90 days of its own telemetry.
- When authorship is unclear → `vendor` + "needs confirmation".

## Skills

| Name | Type | Verdict | Evidence | Proposed action |
|---|---|---|---|---|
| `concat-content` | skill | **mine** | Real directory, absent from the lockfile; Spanish, CONCAT / onconcat.com branding, JSX format from `lib/blog-posts.tsx` in his own repo | **Migrated** to `lucas-core`. Confirm the CONCAT blog is still active (0 invocations in the window) |
| `pm-agent` | skill | **mine** | Real directory, outside the lockfile, no external author; invoked 2026-08-15 | **Migrated** to `lucas-core`. Renamed `skill.md` → `SKILL.md` and dropped the non-standard `user-invocable` key |
| `whiteboard` | skill | **mine** | Real directory with bespoke `kit.py`/`build.py`/`publish.sh`, written in Spanish, no third-party license or author; invoked 2026-08-06 | **Migrated** to `lucas-core` (without `__pycache__`) |
| `freeticket-cli` | skill | vendor · **needs confirmation** | Lockfile: `AppFreeticket/agent-skills`. That org is Lucas's (it shows up in `gh api user/orgs`), but the repo is canonical and already ships as the `freeticket@freeticket` plugin; invoked 2026-08-13 | **Do not republish.** Keep `AppFreeticket/agent-skills` as the single source and declare it in the manifest. Confirm whether authorship is Lucas's or the company's |
| `video-use` | skill | vendor · `dead?` | Symlink to `~/Developer/video-use`; remote `browser-use/video-use`, `LICENSE` MIT © Browser Use, sole author in the log: Shawn Pana | Leave as is or uninstall. Never into the plugin |
| `find-skills` | skill | vendor | Lockfile: `vercel-labs/skills`; invoked 2026-08-21 | Declare in the manifest so it can be reinstalled |
| `to-prd` | skill | vendor · `dead?` | Lockfile: `mattpocock/skills` (plugin `mattpocock-skills`) | Overlaps with `pm-agent`; decide on keeping only one |
| `orca-cli` | skill | vendor | Lockfile: `stablyai/orca`; invoked 2026-08-21 | Declare in the manifest |
| `insforge` | skill | vendor | Lockfile: `insforge/agent-skills`, `license: Apache-2.0`; invoked 2026-07-30 | Declare in the manifest |
| `insforge-cli` | skill | vendor | Lockfile: `insforge/agent-skills`; invoked 2026-08-01 | Declare in the manifest |
| `insforge-debug` | skill | vendor · `dead?` | Lockfile: `insforge/agent-skills`; no invocations | Installed as a block with the other insforge skills; leave it |
| `insforge-integrations` | skill | vendor · `dead?` | Lockfile: `insforge/agent-skills`; no invocations | Same as above |
| `gpt-image` | skill | vendor | Lockfile: `skills-101/superpowers`; installed 2026-08-18 (new, no usage yet) | Declare in the manifest |
| `gpt-image-2-prompting` | skill | vendor | Lockfile: `zhouwei713/gpt-image-2-prompting-skill`; frontmatter `author: Hermes Agent` | Declare in the manifest |
| `brandkit` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | See the "the taste-skill block" note |
| `design-taste-frontend` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/taste-skill/`) | See the note |
| `full-output-enforcement` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/output-skill/`) | See the note |
| `gpt-taste` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | See the note |
| `high-end-visual-design` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/soft-skill/`) | See the note |
| `image-to-code` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | See the note |
| `imagegen-frontend-mobile` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | See the note |
| `imagegen-frontend-web` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | See the note |
| `industrial-brutalist-ui` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/brutalist-skill/`) | See the note |
| `minimalist-ui` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/minimalist-skill/`) | See the note |
| `redesign-existing-projects` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/redesign-skill/`) | See the note |
| `stitch-design-taste` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/stitch-skill/`) | See the note |

### The `taste-skill` block

Twelve of the 26 skills come from the same repo (`Leonxlnx/taste-skill`,
installed 2026-05-07) and **none of them records a single invocation** in the
available window. Worse, they cannibalize each other: `design-taste-frontend`,
`gpt-taste`, `high-end-visual-design`, `minimalist-ui`,
`industrial-brutalist-ui`, `stitch-design-taste` and
`redesign-existing-projects` all compete for the same words ("design",
"premium UI", "redesign"), so the model cannot reliably pick any of them.
`imagegen-frontend-web` / `-mobile` / `brandkit` / `image-to-code` collide the
same way over image generation.

Proposal: keep two at most (one for visual direction, one for imagery) and
uninstall the rest. Since this is third-party work, the decision only affects
`~/.claude`; none of it is copied into the plugin.

## Agents (`~/.claude/agents/`)

| Name | Type | Verdict | Evidence | Proposed action |
|---|---|---|---|---|
| `ft-software-architect` | agent | **mine** | Written for FreeTicket (`free-admin`), Spanish examples, `~/Documents/FT/ai-native` paths; used 2026-08-18 | **Does not go into `lucas-core`**: it is repo-specific. Move it to `free-admin/.claude/agents/` or to a `lucas-freeticket` plugin in phase 2 |
| `ft-testing-expert` | agent | **mine** | Same origin; knows `vitest.config.mts` and the repo's Playwright projects; used 2026-08-18 | Same |
| `ft-qa-reviewer` | agent | **mine** | Same origin; encodes FreeTicket's 10% fee + 19% VAT rules; used 2026-08-21 | Same |
| `ft-devops-ci` | agent | **mine** | Same origin; describes `free-admin`'s `.github/workflows/ci.yml`; used 2026-08-11 | Same. Least used of the four (1 session); review whether to keep it |

All four are Lucas's own work and all four are alive, but none is reusable
outside `free-admin`: publishing them in `lucas-core` would load dead context
on every other machine. They get their own plugin when it exists.

## Migrated into `lucas-core` v0.1.0

- Skills: `concat-content`, `pm-agent`, `whiteboard` (3 of 26).
- Agents: `skillsmith`, `skills-cli`, `site-ripper`, `site-rebuilder`, copied
  from `lucas-leguizamo/.claude/agents/`. The other five in that directory
  (`design-guardian`, `content-i18n`, `seo-portfolio`, `perf-optimizer`,
  `qa-verifier`) belong to the portfolio and stay there.

Changes applied to the copies, frontmatter only:

- `pm-agent`: `skill.md` → `SKILL.md`; removed `user-invocable: true` (not a
  key of the format).
- `concat-content`: removed the `triggers:` list (also not part of the format)
  and absorbed its triggers into the `description`.
- All three: `description` rewritten in the third person, saying what it does
  and when it fires, using the real words in Spanish and English.
- Bodies untouched.

## Follow-up in v0.1.1 — English

The public surface (skill and agent descriptions and bodies, plugin manifests,
READMEs, this audit) was translated to English so the repo works as open
source. **The Spanish triggers stay**: every `description` lists its trigger
phrases in both languages, because Lucas prompts in Spanish. Proper nouns and
domain terms are untouched (CONCAT, onconcat.com, nanobanana, FreeTicket,
PyMEs), and `concat-content` still produces its articles in Spanish — that is
now stated explicitly in the skill body so no agent starts writing the blog in
English.

## Pending confirmation

1. `freeticket-cli` — Lucas's work or the company's? Either way it is not
   republished: the source is `AppFreeticket/agent-skills`.
2. The `taste-skill` block (12 skills) — confirm deletion; the available usage
   window is 30 days, not 90.
3. The 4 `ft-*` agents — confirm the destination: the `free-admin` repo or a
   `lucas-freeticket` plugin.
4. `to-prd` vs `pm-agent` — they overlap; decide which one survives.

## Installed third-party marketplaces (declared only)

`AgriciDaniel-claude-seo`, `caveman`, `claude-plugins-official`, `freeticket`,
`last30days-skill`, `mercadopago-claude-marketplace`,
`nextlevelbuilder-ui-ux-pro-max-skill`, `ponytail`, `supabase-agent-skills`,
`ui-ux-pro-max-skill`. None is copied here; the CLI manifest will reinstall
them with `claude plugin install`.
