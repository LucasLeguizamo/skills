import { parseArgs } from "node:util";
import { UserError } from "./out.js";

export const COMMANDS = [
  "init",
  "list",
  "export",
  "new",
  "add",
  "remove",
  "sync",
  "doctor",
  "help",
] as const;

export type Command = (typeof COMMANDS)[number];

/** Implementados en esta versión; el resto sale con "no implementado aún". */
export const IMPLEMENTED = new Set<Command>(["init", "list", "export", "new", "help"]);

export interface Parsed {
  command: Command;
  positionals: string[];
  json: boolean;
  help: boolean;
  version: boolean;
  dryRun: boolean;
  yes: boolean;
  color: boolean;
  out?: string;
  type?: string;
}

const options = {
  json: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
  version: { type: "boolean", short: "v", default: false },
  "dry-run": { type: "boolean", default: false },
  yes: { type: "boolean", short: "y", default: false },
  "no-color": { type: "boolean", default: false },
  out: { type: "string" },
  type: { type: "string" },
} as const;

export function parseCli(argv: string[]): Parsed {
  let values: Record<string, unknown>;
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({ args: argv, options, allowPositionals: true, strict: true }) as {
      values: Record<string, unknown>;
      positionals: string[];
    });
  } catch (err) {
    throw new UserError((err as Error).message + "\nCorré `skills --help`.", "bad-flag");
  }

  const [first, ...rest] = positionals;
  const wantsVersion = values.version === true;
  const command = (first ?? (wantsVersion ? "help" : "help")) as string;
  if (!COMMANDS.includes(command as Command)) {
    throw new UserError(`comando desconocido: ${command}\nConocidos: ${COMMANDS.join(", ")}`, "unknown-command");
  }

  return {
    command: command as Command,
    positionals: rest,
    json: values.json === true,
    help: values.help === true,
    version: wantsVersion,
    dryRun: values["dry-run"] === true,
    yes: values.yes === true,
    color: values["no-color"] !== true,
    out: typeof values.out === "string" ? values.out : undefined,
    type: typeof values.type === "string" ? values.type : undefined,
  };
}

export const HELP: Record<string, string> = {
  root: `skills — gestiona tu setup de Claude Code: skills, agentes, plugins, hooks y MCP.

Uso: skills <comando> [opciones]

Comandos
  init                       escanea ~/.claude y genera ~/.claude/skills.json
  list                       inventario de esta máquina con origen, versión y tag
  export                     emite registry.json (sólo lo tageado "mine")
  new <skill|agent|plugin> <nombre>
                             andamiaje con el estándar del marketplace
  add <fuente>               (no implementado aún)
  remove <nombre>            (no implementado aún)
  sync                       (no implementado aún)
  doctor                     (no implementado aún)

Opciones globales
  --json                     salida legible por máquina (todo comando la soporta)
  --no-color                 sin ANSI; también se respeta NO_COLOR
  -h, --help                 ayuda del comando
  -v, --version              versión del CLI

El manifest ~/.claude/skills.json es la fuente de verdad y se versiona en git.
Cada elemento lleva un tag: mine (autoría propia), vendor (de terceros) o
unknown (sin evidencia). Los tags editados a mano sobreviven a un \`init\`.

Entorno
  NO_COLOR              apaga el ANSI
  SKILLS_CLAUDE_HOME    usa otro ~/.claude (tests, máquinas ajenas)
  SKILLS_AGENTS_HOME    usa otro ~/.agents (el lockfile de skills.sh)
  SKILLS_REPO           fuerza la raíz del repo de marketplace
  SKILLS_REF            rama para las URLs de \`source\` en registry.json

Documentación: https://github.com/lucasleguizamo/skills`,

  init: `skills init — escanea ~/.claude y escribe el manifest.

Uso: skills init [--dry-run] [--json]

Lee, sin modificarlos:
  ~/.claude/skills/*/SKILL.md              skills sueltas y su frontmatter
  ~/.claude/agents/*.md                    subagentes de usuario
  ~/.claude/plugins/installed_plugins.json plugins instalados y su commit
  ~/.claude/plugins/known_marketplaces.json marketplaces declarados
  ~/.claude/settings.json                  hooks, plugins activos y MCP
  ~/.agents/.skill-lock.json               repo de origen de cada skill (autoría)

Escribe ~/.claude/skills.json. Es no destructivo:
  · si el manifest ya existe, hace merge; el tag que hayas editado a mano gana
  · lo declarado en el manifest pero ausente en esta máquina no se borra
  · antes de sobreescribir respalda en ~/.claude/.skills-backup/<timestamp>/
  · si nada cambió no escribe (y lo dice), así que correrlo dos veces es igual

De los valores de los servidores MCP sólo se guardan los NOMBRES de las
variables de entorno. Ningún secreto entra al manifest.

El array \`exclude\` del manifest apaga ítems que no querés gestionar todavía:
\`["mcp:n8n"]\`, o el nombre pelado. Lo excluido no entra al manifest, no sale
en \`list\` y no se exporta. \`init\` lo siembra la primera vez y después no lo
toca nunca: es tuyo.

Opciones
  --dry-run    imprime el diff y no escribe nada
  --json       { ok, manifest, diff, wrote, backup, excluded }`,

  list: `skills list — inventario de esta máquina.

Uso: skills list [--type skill|agent|plugin|marketplace|hook|mcp] [--json]

Escanea ~/.claude en vivo y, si existe el manifest, superpone sus tags: la
lista dice lo que hay instalado hoy, con la clasificación que vos aprobaste.
No escribe nada. Funciona aunque nunca hayas corrido \`init\`.

Lo que esté en el array \`exclude\` del manifest no se muestra: sólo se informa
cuántos ítems quedaron fuera.

Columnas: nombre · tag · origen · versión.

Opciones
  --type <t>   filtra por tipo
  --json       { ok, source, excluded, counts, skills, agents, plugins,
                       marketplaces, hooks, mcpServers }`,

  export: `skills export — emite registry.json para lucasleguizamo.com/stack.

Uso: skills export [--out <archivo>] [--json]

Toma el manifest y las SKILL.md / agentes de plugins/lucas-core y emite un
JSON con SÓLO lo tageado "mine", menos lo que apague el array \`exclude\`. El portafolio genera páginas estáticas desde
ese archivo, así que el esquema es un contrato:

  { version: 2, generatedAt,
    marketplace: { name, install },
    items: [ { slug, type (skill|agent|plugin), name,
               summary: { en, es }, whenToUse: { en, es },
               category, source, install, version, updatedAt } ] }

  summary     una línea: qué hace (primera oración de la description)
  whenToUse   cuándo dispararla (la parte "Úsala cuando…" de la description)
  source      URL del archivo en GitHub
  install     comando de instalación, copiable tal cual
  version     versión del plugin que lo empaqueta
  updatedAt   fecha del último commit que tocó el archivo (o su mtime)

summary y whenToUse son bilingües. El inglés sale del frontmatter (fuente
única); el español, de i18n/es.json en la raíz del repo, un mapa
slug -> { summary, whenToUse } con los dos campos opcionales. Si falta la
traducción de un slug o de un campo, en \`es\` sale el inglés y el comando
sigue: nunca falla ni deja un campo vacío. Los huecos se informan al final
y en --json bajo \`missingEs\`.

generatedAt es el updatedAt más reciente, no la hora de correr el comando:
exportar dos veces produce bytes idénticos.

Opciones
  --out <f>    destino (por defecto <repo>/registry.json)
  --json       { ok, out, count, unchanged, excluded, excludedByRule,
                 missingEs, registry }`,

  new: `skills new — andamiaje con el estándar del marketplace.

Uso: skills new <skill|agent|plugin> <nombre> [--out <dir>] [--json]

  skill    <dir>/<nombre>/SKILL.md con frontmatter name + description
  agent    <dir>/<nombre>.md con name, description con 2 <example>, y tools
  plugin   plugins/<nombre>/.claude-plugin/plugin.json + skills/ + agents/

El nombre debe ser kebab-case y coincide con el directorio: es lo que Claude
Code usa para invocar. La description va en tercera persona y dice qué hace
Y cuándo dispararse, con las palabras reales que usarías al pedirlo.

Destino por defecto: plugins/lucas-core/{skills,agents} del repo en el que
estés parado; si no hay repo de marketplace, ~/.claude/{skills,agents}.

Nunca sobreescribe: si el destino existe, sale con código 1.

Opciones
  --out <dir>  directorio base
  --json       { ok, kind, name, created: [rutas] }`,
};
