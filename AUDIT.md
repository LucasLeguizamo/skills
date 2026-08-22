# Auditoría de `~/.claude` — 2026-08-21

Alcance: las 26 skills de `~/.claude/skills/` y los 4 agentes de
`~/.claude/agents/`. `~/.claude` se leyó sin modificarse: todo lo migrado es
una **copia**.

## Método

- **Autoría.** `~/.agents/.skill-lock.json` registra el repo de origen de cada
  skill instalada con `npx skills add`. Ese lockfile es la prueba dura: 22 de
  las 26 vienen de repos de terceros. Las 4 restantes (3 directorios reales +
  1 symlink a `~/Developer`) se revisaron a mano buscando autor, licencia,
  idioma y referencias a proyectos de Lucas.
- **Uso.** Se contaron invocaciones reales (`"skill":"<name>"` y
  `"subagent_type":"<name>"`) en los 1.134 transcripts de `~/.claude/projects`.
  **Límite conocido:** el corpus sólo cubre 2026-07-22 → 2026-08-21 (~30 días);
  los transcripts más viejos ya no están. Por eso no se puede certificar la
  regla de 90 días.
- **Notación.** `dead?` = cero invocaciones en la ventana disponible. Es un
  candidato a borrar, no una sentencia: confirmar con Lucas o esperar a que
  `skills doctor` acumule 90 días de telemetría propia.
- Ante la duda de autoría → `vendor` + "requiere confirmación".

## Skills

| Nombre | Tipo | Veredicto | Evidencia | Acción propuesta |
|---|---|---|---|---|
| `concat-content` | skill | **mine** | Directorio real, no está en el lockfile; español, marca CONCAT / onconcat.com, formato JSX de `lib/blog-posts.tsx` de su propio repo | **Migrada** a `lucas-core`. Confirmar que el blog de CONCAT sigue activo (0 invocaciones en la ventana) |
| `pm-agent` | skill | **mine** | Directorio real, fuera del lockfile, sin autor externo; invocada 2026-08-15 | **Migrada** a `lucas-core`. Se renombró `skill.md` → `SKILL.md` y se quitó la clave no estándar `user-invocable` |
| `whiteboard` | skill | **mine** | Directorio real con `kit.py`/`build.py`/`publish.sh` escritos a medida, español rioplatense, sin licencia ni autor de terceros; invocada 2026-08-06 | **Migrada** a `lucas-core` (sin `__pycache__`) |
| `freeticket-cli` | skill | vendor · **requiere confirmación** | Lockfile: `AppFreeticket/agent-skills`. Esa org es de Lucas (aparece en `gh api user/orgs`), pero el repo es el canónico y ya se distribuye como plugin `freeticket@freeticket`; invocada 2026-08-13 | **No republicar.** Mantener `AppFreeticket/agent-skills` como fuente única y declararla en el manifest. Confirmar si es autoría de Lucas o de la empresa |
| `video-use` | skill | vendor · `dead?` | Symlink a `~/Developer/video-use`; remote `browser-use/video-use`, `LICENSE` MIT © Browser Use, único autor en el log: Shawn Pana | Dejar como está o desinstalar. Nunca al plugin |
| `find-skills` | skill | vendor | Lockfile: `vercel-labs/skills`; invocada 2026-08-21 | Declarar en el manifest para reinstalar |
| `to-prd` | skill | vendor · `dead?` | Lockfile: `mattpocock/skills` (plugin `mattpocock-skills`) | Se solapa con `pm-agent`; evaluar quedarse con una sola |
| `orca-cli` | skill | vendor | Lockfile: `stablyai/orca`; invocada 2026-08-21 | Declarar en el manifest |
| `insforge` | skill | vendor | Lockfile: `insforge/agent-skills`, `license: Apache-2.0`; invocada 2026-07-30 | Declarar en el manifest |
| `insforge-cli` | skill | vendor | Lockfile: `insforge/agent-skills`; invocada 2026-08-01 | Declarar en el manifest |
| `insforge-debug` | skill | vendor · `dead?` | Lockfile: `insforge/agent-skills`; sin invocaciones | Se instala en bloque con las otras insforge; dejar |
| `insforge-integrations` | skill | vendor · `dead?` | Lockfile: `insforge/agent-skills`; sin invocaciones | Igual que la anterior |
| `gpt-image` | skill | vendor | Lockfile: `skills-101/superpowers`; instalada 2026-08-18 (nueva, aún sin uso) | Declarar en el manifest |
| `gpt-image-2-prompting` | skill | vendor | Lockfile: `zhouwei713/gpt-image-2-prompting-skill`; frontmatter `author: Hermes Agent` | Declarar en el manifest |
| `brandkit` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | Ver nota "el bloque taste-skill" |
| `design-taste-frontend` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/taste-skill/`) | Ver nota |
| `full-output-enforcement` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/output-skill/`) | Ver nota |
| `gpt-taste` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | Ver nota |
| `high-end-visual-design` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/soft-skill/`) | Ver nota |
| `image-to-code` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | Ver nota |
| `imagegen-frontend-mobile` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | Ver nota |
| `imagegen-frontend-web` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` | Ver nota |
| `industrial-brutalist-ui` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/brutalist-skill/`) | Ver nota |
| `minimalist-ui` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/minimalist-skill/`) | Ver nota |
| `redesign-existing-projects` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/redesign-skill/`) | Ver nota |
| `stitch-design-taste` | skill | vendor · `dead?` | Lockfile: `Leonxlnx/taste-skill` (`skills/stitch-skill/`) | Ver nota |

### El bloque `taste-skill`

Doce de las 26 skills salen del mismo repo (`Leonxlnx/taste-skill`, instaladas
el 2026-05-07) y **ninguna registra una sola invocación** en la ventana
disponible. Peor: se canibalizan entre sí — `design-taste-frontend`,
`gpt-taste`, `high-end-visual-design`, `minimalist-ui`,
`industrial-brutalist-ui`, `stitch-design-taste` y
`redesign-existing-projects` compiten por las mismas palabras ("diseño",
"UI premium", "rediseñar"), así que el modelo no elige ninguna de forma
confiable. `imagegen-frontend-web` / `-mobile` / `brandkit` / `image-to-code`
se pisan igual en generación de imágenes.

Propuesta: quedarse con dos como máximo (una de dirección visual, una de
imagen) y desinstalar el resto. Como es trabajo de un tercero, la decisión
sólo afecta a `~/.claude`; nada de esto se copia al plugin.

## Agentes (`~/.claude/agents/`)

| Nombre | Tipo | Veredicto | Evidencia | Acción propuesta |
|---|---|---|---|---|
| `ft-software-architect` | agente | **mine** | Escrito para FreeTicket (`free-admin`), ejemplos en español, rutas `~/Documents/FT/ai-native`; usado 2026-08-18 | **No va a `lucas-core`**: es específico de un repo. Mover a `free-admin/.claude/agents/` o a un plugin `lucas-freeticket` en fase 2 |
| `ft-testing-expert` | agente | **mine** | Igual origen; conoce `vitest.config.mts` y los proyectos Playwright del repo; usado 2026-08-18 | Igual |
| `ft-qa-reviewer` | agente | **mine** | Igual origen; reglas de fee 10% + IVA 19% de FreeTicket; usado 2026-08-21 | Igual |
| `ft-devops-ci` | agente | **mine** | Igual origen; describe `.github/workflows/ci.yml` de `free-admin`; usado 2026-08-11 | Igual. Es el menos usado de los cuatro (1 sesión); revisar si se mantiene |

Los cuatro son de autoría propia y están vivos, pero ninguno es reutilizable
fuera de `free-admin`: publicarlos en `lucas-core` cargaría contexto muerto en
cualquier otra máquina. Van a su propio plugin cuando exista.

## Migrado a `lucas-core` v0.1.0

- Skills: `concat-content`, `pm-agent`, `whiteboard` (3 de 26).
- Agentes: `skillsmith`, `skills-cli`, `site-ripper`, `site-rebuilder`,
  copiados desde `lucas-leguizamo/.claude/agents/`. Los otros cinco de ese
  directorio (`design-guardian`, `content-i18n`, `seo-portfolio`,
  `perf-optimizer`, `qa-verifier`) son del portafolio y se quedan ahí.

Cambios aplicados a las copias, sólo en el frontmatter:

- `pm-agent`: `skill.md` → `SKILL.md`; se eliminó `user-invocable: true` (no es
  una clave del formato).
- `concat-content`: se eliminó la lista `triggers:` (tampoco es del formato) y
  sus disparadores se absorbieron en la `description`.
- Las tres: `description` reescrita en tercera persona, con qué hace + cuándo
  dispararse, y las palabras reales en español y en inglés.
- Cuerpos sin tocar.

## Pendiente de confirmación

1. `freeticket-cli` — ¿autoría de Lucas o de la empresa? En cualquier caso no
   se republica: la fuente es `AppFreeticket/agent-skills`.
2. El bloque `taste-skill` (12 skills) — confirmar el borrado; la ventana de
   uso disponible es de 30 días, no de 90.
3. Los 4 agentes `ft-*` — confirmar destino: repo `free-admin` o plugin
   `lucas-freeticket`.
4. `to-prd` vs `pm-agent` — se solapan; decidir cuál sobrevive.

## Marketplaces de terceros instalados (sólo se declaran)

`AgriciDaniel-claude-seo`, `caveman`, `claude-plugins-official`, `freeticket`,
`last30days-skill`, `mercadopago-claude-marketplace`,
`nextlevelbuilder-ui-ux-pro-max-skill`, `ponytail`, `supabase-agent-skills`,
`ui-ux-pro-max-skill`. Ninguno se copia acá; el manifest del CLI los
reinstalará con `claude plugin install`.
