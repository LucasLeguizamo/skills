import path from "node:path";
import fs from "node:fs/promises";
import { claudeHome, findRepoRoot } from "../lib/paths.js";
import { exists } from "../lib/fsx.js";
import { UserError, emitJson, heading, line, note } from "../lib/out.js";
import { cyan, green } from "../lib/ansi.js";
import type { Parsed } from "../lib/cli.js";

export const KINDS = ["skill", "agent", "plugin"] as const;
export type Kind = (typeof KINDS)[number];

/** kebab-case estricto: es el identificador con el que Claude Code invoca. */
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface NewPlan {
  kind: Kind;
  name: string;
  root: string;
  files: Array<{ path: string; content: string }>;
}

export function planNew(kind: Kind, name: string, base: string): NewPlan {
  if (!KEBAB.test(name)) {
    throw new UserError(
      `"${name}" no es kebab-case. Usá minúsculas, números y guiones: mi-skill-nueva.`,
      "bad-name",
    );
  }
  if (kind === "skill") {
    const dir = path.join(base, "skills", name);
    return { kind, name, root: dir, files: [{ path: path.join(dir, "SKILL.md"), content: skillTemplate(name) }] };
  }
  if (kind === "agent") {
    const dir = path.join(base, "agents");
    return { kind, name, root: path.join(dir, `${name}.md`), files: [{ path: path.join(dir, `${name}.md`), content: agentTemplate(name) }] };
  }
  const dir = path.join(base, name);
  return {
    kind,
    name,
    root: dir,
    files: [
      { path: path.join(dir, ".claude-plugin", "plugin.json"), content: pluginTemplate(name) },
      { path: path.join(dir, "README.md"), content: pluginReadme(name) },
      { path: path.join(dir, "skills", ".gitkeep"), content: "" },
      { path: path.join(dir, "agents", ".gitkeep"), content: "" },
    ],
  };
}

/**
 * Dónde escribir. Por orden: --out, el plugin lucas-core del repo en el que
 * estés parado, y como último recurso ~/.claude (instalación suelta).
 */
export function resolveBase(kind: Kind, out: string | undefined): string {
  if (out) return path.resolve(out);
  const repo = findRepoRoot();
  if (repo) return kind === "plugin" ? path.join(repo, "plugins") : path.join(repo, "plugins", "lucas-core");
  if (kind === "plugin") {
    throw new UserError(
      "`new plugin` necesita un repo de marketplace. Corrélo dentro del repo `skills` o pasá --out.",
      "no-repo",
    );
  }
  return claudeHome();
}

export async function runNew(opts: Parsed): Promise<number> {
  const [rawKind, name] = opts.positionals;
  if (!rawKind || !name) {
    throw new UserError("uso: skills new <skill|agent|plugin> <nombre>", "usage");
  }
  if (!KINDS.includes(rawKind as Kind)) {
    throw new UserError(`tipo desconocido: ${rawKind}\nValores: ${KINDS.join(", ")}`, "bad-kind");
  }
  const kind = rawKind as Kind;
  const plan = planNew(kind, name, resolveBase(kind, opts.out));

  // Nunca sobreescribe: ni el directorio ni un archivo suelto.
  if (await exists(plan.root)) {
    throw new UserError(`ya existe: ${plan.root}\nBorralo o elegí otro nombre; \`new\` no sobreescribe.`, "exists");
  }
  for (const f of plan.files) {
    if (await exists(f.path)) {
      throw new UserError(`ya existe: ${f.path}`, "exists");
    }
  }

  for (const f of plan.files) {
    await fs.mkdir(path.dirname(f.path), { recursive: true });
    await fs.writeFile(f.path, f.content, "utf8");
  }

  const created = plan.files.map((f) => f.path);
  if (opts.json) {
    emitJson({ ok: true, kind, name, root: plan.root, created });
    return 0;
  }
  heading(`${kind} ${cyan(name)}`);
  for (const f of created) line(`${green("+")} ${f}`);
  line();
  note("Completá la description: qué hace Y cuándo dispararse, con las palabras reales que usarías al pedirlo.");
  return 0;
}

function skillTemplate(name: string): string {
  const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return `---
name: ${name}
description: TODO en tercera persona — qué hace esta skill y qué produce. Úsala cuando el usuario diga "TODO disparador 1", "TODO disparador 2", o TODO trigger in English.
---

# ${title}

TODO: una frase que diga qué hace esta skill y para quién.

## Cuándo usarla

- TODO: situación concreta 1.
- TODO: situación concreta 2.

## Cuándo NO usarla

- TODO: el caso que parece esto pero no lo es, y qué usar en su lugar.

## Cómo trabaja

1. TODO: primer paso, en imperativo.
2. TODO: segundo paso.
3. TODO: qué devuelve y en qué formato.

## Salida

TODO: el formato exacto del entregable (archivo, bloque de código, tabla).

## Reglas

- TODO: la regla que evita el error más común.
`;
}

function agentTemplate(name: string): string {
  const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return `---
name: ${name}
description: >
  TODO en tercera persona — qué hace este agente y qué NO hace. Úsalo cuando
  TODO: la condición de disparo, con las palabras que el usuario diría.

  <example>
  user: "TODO: pedido real y textual del usuario"
  assistant: "Uso ${name} para TODO."
  </example>

  <example>
  user: "TODO: segundo pedido, distinto del primero"
  assistant: "Invoco ${name} para TODO."
  </example>
tools: Read, Grep, Glob, Edit, Write, Bash
---

# ${title}

TODO: quién es este agente y cuál es su única responsabilidad.

## Alcance

- Hace: TODO.
- No hace: TODO (eso es de otro agente).

## Procedimiento

1. TODO.
2. TODO.

## Entregable

TODO: qué devuelve al terminar y en qué formato.
`;
}

function pluginTemplate(name: string): string {
  return (
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        description: `TODO: qué empaqueta ${name} y para quién.`,
        author: { name: "Lucas Leguizamo", url: "https://github.com/lucasleguizamo" },
        license: "MIT",
        homepage: "https://github.com/lucasleguizamo/skills",
        repository: "https://github.com/lucasleguizamo/skills",
        keywords: ["claude-code", "skills", "agents"],
      },
      null,
      2,
    ) + "\n"
  );
}

function pluginReadme(name: string): string {
  return `# ${name}

TODO: qué empaqueta este plugin.

## Instalación

\`\`\`
/plugin marketplace add lucasleguizamo/skills
/plugin install ${name}@lucas
\`\`\`

## Contenido

| Elemento | Tipo | Qué hace |
|---|---|---|
| TODO | skill | TODO |

Falta declararlo en \`.claude-plugin/marketplace.json\` de la raíz del repo.
`;
}
