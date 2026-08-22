import { p } from "../lib/paths.js";
import { scanMachine } from "../lib/scan.js";
import {
  applyExclusions,
  loadManifest,
  mergeSection,
  saveManifest,
  sameManifest,
  type DiffEntry,
  type Manifest,
} from "../lib/manifest.js";
import { DEFAULT_EXCLUDE } from "../lib/classify.js";
import { emitJson, heading, line, note, table } from "../lib/out.js";
import { bold, cyan, dim, green, yellow } from "../lib/ansi.js";
import type { Parsed } from "../lib/cli.js";

export interface InitResult {
  ok: true;
  /** Cuántos ítems dejó fuera el campo `exclude` del manifest. */
  excluded: number;
  manifestPath: string;
  wrote: boolean;
  dryRun: boolean;
  backup: string | null;
  diff: DiffEntry[];
  counts: Record<string, number>;
  manifest: Manifest;
}

/** Escaneo + merge. Sin efectos: `run` decide si escribe. */
export async function planInit(): Promise<{
  next: Manifest;
  previous: Manifest | null;
  diff: DiffEntry[];
  excluded: number;
}> {
  const scanned = await scanMachine();
  const previous = await loadManifest();
  const diff: DiffEntry[] = [];

  // `exclude` es del usuario: si ya existe se respeta tal cual, no se ordena
  // ni se completa. Sólo se siembra la primera vez.
  const exclude = previous?.exclude ?? [...DEFAULT_EXCLUDE];
  const excluded = applyExclusions(scanned, exclude);
  scanned.exclude = exclude;

  if (!previous) return { next: scanned, previous: null, diff, excluded };
  // También sobre el manifest anterior: si no, el merge resucitaría como
  // "declarado en otra máquina" algo que se acaba de excluir.
  applyExclusions(previous, exclude);

  const next: Manifest = {
    ...scanned,
    generatedAt: previous.generatedAt,
    skills: mergeSection("skill", previous.skills ?? {}, scanned.skills, diff),
    agents: mergeSection("agent", previous.agents ?? {}, scanned.agents, diff),
    plugins: mergeSection("plugin", previous.plugins ?? {}, scanned.plugins, diff),
    marketplaces: mergeSection("marketplace", previous.marketplaces ?? {}, scanned.marketplaces, diff),
  };
  return { next, previous, diff, excluded };
}

export async function runInit(opts: Parsed): Promise<number> {
  const { next, previous, diff, excluded } = await planInit();
  const changed = !previous || !sameManifest(previous, next);
  if (changed) next.generatedAt = new Date().toISOString();

  const counts = {
    skills: Object.keys(next.skills).length,
    agents: Object.keys(next.agents).length,
    plugins: Object.keys(next.plugins).length,
    marketplaces: Object.keys(next.marketplaces).length,
    hooks: next.hooks.length,
    mcpServers: Object.keys(next.mcpServers).length,
    mine: countTag(next, "mine"),
    vendor: countTag(next, "vendor"),
    unknown: countTag(next, "unknown"),
  };

  let backup: string | null = null;
  const wrote = changed && !opts.dryRun;
  if (wrote) backup = await saveManifest(next);

  const result: InitResult = {
    ok: true,
    excluded,
    manifestPath: p.manifest(),
    wrote,
    dryRun: opts.dryRun,
    backup,
    diff,
    counts,
    manifest: next,
  };

  if (opts.json) {
    emitJson(result);
    return 0;
  }

  heading(`Manifest ${cyan(p.manifest())}`);
  table(
    [
      ["skills", String(counts.skills)],
      ["agentes", String(counts.agents)],
      ["plugins", String(counts.plugins)],
      ["marketplaces", String(counts.marketplaces)],
      ["hooks", String(counts.hooks)],
      ["MCP", String(counts.mcpServers)],
    ],
  );
  line();
  line(
    `${green("mine")} ${counts.mine}   ${dim("vendor")} ${counts.vendor}   ${yellow("unknown")} ${counts.unknown}`,
  );
  if (excluded > 0) note(`${excluded} ítem(s) fuera por el campo \`exclude\` del manifest.`);

  if (!previous) {
    heading("Primera vez");
    note("No había manifest: se escribe uno nuevo con la clasificación semilla de AUDIT.md.");
    note("Revisá los `unknown` y editá su `tag` a mano; el próximo init respeta tu edición.");
  } else if (!changed) {
    heading("Sin cambios");
    note("El manifest ya refleja esta máquina.");
  } else if (diff.length === 0) {
    heading("Cambios");
    note("Fuera de skills/agentes/plugins/marketplaces: hooks, MCP o el campo `exclude`.");
  } else {
    heading(`Cambios (${diff.length})`);
    table(
      diff.map((d) => [d.change, d.kind, d.name, d.detail ?? ""]),
      ["cambio", "tipo", "nombre", "detalle"],
    );
  }

  line();
  if (opts.dryRun) {
    line(bold(changed ? "--dry-run: no se escribió nada." : "--dry-run: no había nada que escribir."));
  } else if (wrote) {
    line(`${green("escrito")} ${p.manifest()}`);
    if (backup) note(`respaldo del anterior en ${backup}`);
  } else {
    line(dim("nada que escribir."));
  }
  return 0;
}

function countTag(m: Manifest, tag: string): number {
  const bags = [m.skills, m.agents, m.plugins, m.marketplaces];
  let n = 0;
  for (const bag of bags) {
    for (const entry of Object.values(bag) as Array<{ tag?: string }>) {
      if (entry.tag === tag) n++;
    }
  }
  return n;
}
