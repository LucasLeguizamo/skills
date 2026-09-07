import { scanMachine } from "../lib/scan.js";
import { applyExclusions, loadManifest, type Manifest } from "../lib/manifest.js";
import { UserError, emitJson, heading, line, note, table } from "../lib/out.js";
import { dim, green, yellow } from "../lib/ansi.js";
import { DEAD_CANDIDATES, DEFAULT_EXCLUDE } from "../lib/classify.js";
import type { Parsed } from "../lib/cli.js";

const TYPES = ["skill", "agent", "plugin", "marketplace", "hook", "mcp"] as const;
type Type = (typeof TYPES)[number];

/**
 * Escaneo en vivo con los tags del manifest superpuestos: la lista describe
 * la máquina, el manifest sólo aporta la clasificación aprobada.
 */
export function overlayTags(scanned: Manifest, manifest: Manifest | null): Manifest {
  if (!manifest) return scanned;
  const bags = ["skills", "agents", "plugins", "marketplaces"] as const;
  for (const bag of bags) {
    for (const [name, entry] of Object.entries(scanned[bag]) as Array<[string, { tag?: string }]>) {
      const known = (manifest[bag] as Record<string, { tag?: string }>)[name];
      if (known?.tag) entry.tag = known.tag;
    }
  }
  return scanned;
}

export async function runList(opts: Parsed): Promise<number> {
  if (opts.type && !TYPES.includes(opts.type as Type)) {
    throw new UserError(`--type desconocido: ${opts.type}\nValores: ${TYPES.join(", ")}`, "bad-type");
  }
  const manifest = await loadManifest();
  const inv = overlayTags(await scanMachine(), manifest);
  const excluded = applyExclusions(inv, manifest?.exclude ?? DEFAULT_EXCLUDE);
  const want = (t: Type) => !opts.type || opts.type === t;

  if (opts.json) {
    emitJson({
      ok: true,
      source: manifest ? "scan+manifest" : "scan",
      excluded,
      counts: {
        skills: Object.keys(inv.skills).length,
        agents: Object.keys(inv.agents).length,
        plugins: Object.keys(inv.plugins).length,
        marketplaces: Object.keys(inv.marketplaces).length,
        hooks: inv.hooks.length,
        mcpServers: Object.keys(inv.mcpServers).length,
      },
      skills: want("skill") ? inv.skills : undefined,
      agents: want("agent") ? inv.agents : undefined,
      plugins: want("plugin") ? inv.plugins : undefined,
      marketplaces: want("marketplace") ? inv.marketplaces : undefined,
      hooks: want("hook") ? inv.hooks : undefined,
      mcpServers: want("mcp") ? inv.mcpServers : undefined,
    });
    return 0;
  }

  if (!manifest) note("Sin manifest todavía: los tags son la clasificación semilla. Corré `lucasleguizamo init`.");
  if (excluded > 0) note(`${excluded} ítem(s) fuera por el campo \`exclude\` del manifest.`);

  if (want("skill")) {
    heading(`Skills (${Object.keys(inv.skills).length})`);
    table(
      Object.entries(inv.skills).map(([name, s]) => [
        name + (DEAD_CANDIDATES.has(name) ? dim(" ·dead?") : ""),
        paintTag(s.tag),
        s.origin,
        s.version ?? "",
      ]),
      ["nombre", "tag", "origen", "versión"],
    );
  }
  if (want("agent")) {
    heading(`Agentes (${Object.keys(inv.agents).length})`);
    table(
      Object.entries(inv.agents).map(([name, a]) => [name, paintTag(a.tag), a.origin, a.model ?? ""]),
      ["nombre", "tag", "origen", "modelo"],
    );
  }
  if (want("plugin")) {
    heading(`Plugins (${Object.keys(inv.plugins).length})`);
    table(
      Object.entries(inv.plugins).map(([key, pl]) => [
        key,
        paintTag(pl.tag),
        pl.enabled === false ? dim("off") : pl.enabled ? "on" : dim("?"),
        pl.scope ?? "",
        pl.version ?? "",
      ]),
      ["plugin@marketplace", "tag", "activo", "alcance", "versión"],
    );
  }
  if (want("marketplace")) {
    heading(`Marketplaces (${Object.keys(inv.marketplaces).length})`);
    table(
      Object.entries(inv.marketplaces).map(([name, mk]) => [name, paintTag(mk.tag), mk.origin, mk.ref ?? ""]),
      ["nombre", "tag", "origen", "ref"],
    );
  }
  if (want("hook")) {
    heading(`Hooks (${inv.hooks.length})`);
    table(
      inv.hooks.map((h) => [h.event, h.matcher ?? "", h.type, truncate(h.command, 60)]),
      ["evento", "matcher", "tipo", "comando"],
    );
  }
  if (want("mcp")) {
    heading(`MCP (${Object.keys(inv.mcpServers).length})`);
    table(
      Object.entries(inv.mcpServers).map(([name, s]) => [
        name,
        s.transport,
        s.command ?? s.url ?? "",
        (s.envKeys ?? []).join(","),
      ]),
      ["nombre", "transporte", "comando/url", "env (sólo nombres)"],
    );
  }
  line();
  return 0;
}

function paintTag(tag: string): string {
  if (tag === "mine") return green("mine");
  if (tag === "unknown") return yellow("unknown");
  return dim("vendor");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
