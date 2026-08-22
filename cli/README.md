# `@lucasleguizamo/skills`

CLI para inventariar, versionar y reinstalar un setup de Claude Code: skills,
agentes, plugins, hooks y servidores MCP.

Cero dependencias de runtime. Node 24+. TypeScript compilado con `tsc`, sin
bundler. Todo comando soporta `--json`, respeta `NO_COLOR` y no escribe sobre
`~/.claude` sin dejar un respaldo antes.

```
npm i -g @lucasleguizamo/skills
skills --help
```

## Comandos

| Comando | Estado | Qué hace |
|---|---|---|
| `skills init [--dry-run]` | ✅ | escanea `~/.claude` y genera el manifest |
| `skills list [--type t]` | ✅ | inventario de esta máquina con origen, versión y tag |
| `skills export [--out f]` | ✅ | emite `registry.json` para lucasleguizamo.com/stack |
| `skills new <skill\|agent\|plugin> <nombre>` | ✅ | andamiaje con el estándar del marketplace |
| `skills add <fuente>` | ⏳ | instalar una skill de GitHub o un plugin de marketplace |
| `skills remove <nombre>` | ⏳ | desinstalar |
| `skills sync [--dry-run]` | ⏳ | aplicar el manifest a esta máquina |
| `skills doctor` | ⏳ | validar frontmatter, duplicados, rutas y versiones |

Los ⏳ existen como comando: imprimen "no implementado aún" y salen con código 1.

`--help` es la documentación. Si algo de este README no aparece en
`skills <comando> --help`, el que está mal es el README.

## El manifest: `~/.claude/skills.json`

Fuente de verdad, pensada para versionarse en git y viajar entre máquinas.
`init` lo genera leyendo, sin modificarlos:

| Archivo | Aporta |
|---|---|
| `~/.claude/skills/*/SKILL.md` | skills sueltas y su frontmatter |
| `~/.claude/agents/*.md` | subagentes de usuario |
| `~/.claude/plugins/installed_plugins.json` | plugins, versión, alcance y commit |
| `~/.claude/plugins/known_marketplaces.json` | marketplaces declarados |
| `~/.claude/settings.json` | hooks, plugins activos y servidores MCP |
| `~/.agents/.skill-lock.json` | el repo de origen de cada skill: la prueba de autoría |

Forma:

```jsonc
{
  "version": 1,
  "generatedAt": "2026-08-22T03:16:19.073Z",
  "marketplaces": { "<nombre>": { "tag", "sourceType", "origin", "ref?", "install" } },
  "plugins":      { "<plugin@marketplace>": { "tag", "marketplace", "plugin", "version",
                                              "scope", "commit", "enabled", "install" } },
  "skills":       { "<nombre>": { "tag", "sourceType", "origin", "sourceUrl?", "skillPath?",
                                  "description?", "version?", "installedAt?", "updatedAt?", "note?" } },
  "agents":       { "<nombre>": { "tag", "sourceType", "origin", "description?", "model?", "tools?", "note?" } },
  "hooks":        [ { "event", "matcher?", "type", "command", "timeout?" } ],
  "mcpServers":   { "<nombre>": { "transport", "command?", "args?", "url?", "envKeys", "from" } }
}
```

### Tags

| Tag | Significado |
|---|---|
| `mine` | autoría propia: va al plugin y sale publicado en la web |
| `vendor` | de terceros: sólo se declara para poder reinstalarlo |
| `unknown` | sin evidencia de autoría; lo resuelve una persona |

La clasificación se deduce del lockfile (`~/.agents/.skill-lock.json`): lo que
vino de un repo ajeno es `vendor`. Los veredictos humanos de `AUDIT.md` van
como semilla. **El tag que edites a mano gana**: `init` lo conserva.

### Garantías de `init`

- **Idempotente.** Si el manifest ya refleja la máquina, no escribe nada y lo dice.
- **No destructivo.** Los datos derivados se refrescan; tu `tag` y tus claves
  propias (`note`, …) sobreviven al merge.
- **Portable.** Lo declarado en el manifest pero ausente en esta máquina no se
  borra: `sync` lo va a necesitar. Se reporta como `removed-from-disk`.
- **Respaldo.** Antes de sobreescribir copia el anterior a
  `~/.claude/.skills-backup/<timestamp>/`.
- **Sin secretos.** De los servidores MCP guarda los NOMBRES de las variables
  de entorno, nunca sus valores.
- `--dry-run` imprime el diff y no toca nada.

## El contrato de `registry.json`

`skills export` recorre el marketplace del repo (`.claude-plugin/marketplace.json`)
y sus plugins, y emite un JSON con **sólo lo tageado `mine`**. Es lo que
consume `lucasleguizamo.com/stack` para generar páginas estáticas, así que el
esquema es un contrato: romperlo rompe la web.

```jsonc
{
  "version": 1,
  "generatedAt": "2026-08-22T03:04:33.000Z",
  "marketplace": { "name": "lucas", "install": "/plugin marketplace add lucasleguizamo/skills" },
  "items": [
    {
      "slug": "whiteboard",
      "type": "skill",
      "name": "whiteboard",
      "summary": "Dibuja flows, diagramas, wireframes y mapas de arquitectura estilo FigJam/Excalidraw desde Python",
      "whenToUse": "Úsala cuando el usuario pida un diagrama, un flujo, un wireframe…",
      "category": "productivity",
      "source": "https://github.com/lucasleguizamo/skills/blob/main/plugins/lucas-core/skills/whiteboard/SKILL.md",
      "install": "/plugin install lucas-core@lucas",
      "version": "0.1.0",
      "updatedAt": "2026-08-22T03:04:33.000Z"
    }
  ]
}
```

| Campo | Regla |
|---|---|
| `slug` | único en todo el archivo; es la URL `/stack/<slug>`. Ante colisión se antepone el tipo |
| `type` | `skill` · `agent` · `plugin` |
| `name` | el `name` del frontmatter (o del `plugin.json`) |
| `summary` | una línea, sin punto final: la primera oración de la `description` |
| `whenToUse` | el disparador: lo que va desde "Úsala/Úsalo/Invócalo cuando…" hasta el final |
| `category` | `category` del frontmatter, si no la del plugin en el marketplace |
| `source` | URL del archivo en GitHub (`SKILLS_REF` cambia la rama, por defecto `main`) |
| `install` | comando copiable tal cual |
| `version` | versión del plugin que lo empaqueta |
| `updatedAt` | fecha del último commit que tocó el archivo; sin git, su `mtime` |

Los bloques `<example>` de los agentes **no** entran: `summary` y `whenToUse`
salen limpios.

`generatedAt` es el `updatedAt` más reciente, no la hora del reloj: exportar
dos veces sobre el mismo commit produce bytes idénticos y no ensucia el diff.

Los ítems vienen ordenados por `type` y luego por `slug`. Un elemento se
excluye si el manifest lo degradó a `vendor` o `unknown`; el comando los lista
como `excluded`.

## `skills new`

```
skills new skill  mi-skill     # <base>/skills/mi-skill/SKILL.md
skills new agent  mi-agente    # <base>/agents/mi-agente.md
skills new plugin mi-plugin    # <base>/mi-plugin/.claude-plugin/plugin.json + skills/ + agents/
```

Base por defecto: `plugins/lucas-core/` del repo de marketplace en el que
estés parado; si no hay repo, `~/.claude/`. `--out` la fuerza.

Las plantillas ya traen el estándar: `name` en kebab-case idéntico al
directorio, `description` en tercera persona que dice **qué hace y cuándo
dispararse**, y en los agentes dos bloques `<example>` más `tools`. El resto
es `TODO:` a completar.

**Nunca sobreescribe.** Si el destino existe, sale con código 1 sin tocar nada.

## Desarrollo

```
npm install
npm run build      # tsc → dist/
npm test           # build + node --test (sin frameworks)
```

Variables útiles para probar sin tocar tu máquina:

| Variable | Para qué |
|---|---|
| `SKILLS_CLAUDE_HOME` | apunta a un `~/.claude` falso |
| `SKILLS_AGENTS_HOME` | apunta a un `~/.agents` falso |
| `SKILLS_REPO` | fuerza la raíz del repo de marketplace |
| `SKILLS_REF` | rama para las URLs de `source` en el registry |
| `NO_COLOR` | apaga el ANSI |

## Licencia

MIT © 2026 Lucas Leguizamo
