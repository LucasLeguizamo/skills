import { p } from "./paths.js";
import { readJson, writeJson, backup, exists } from "./fsx.js";

export const MANIFEST_VERSION = 1;

/** mine = autoría propia (va al plugin y a la web) · vendor = de terceros
 *  (sólo se declara para reinstalarlo) · unknown = sin evidencia, lo decide un humano. */
export type Tag = "mine" | "vendor" | "unknown";

export interface SkillEntry {
  tag: Tag;
  sourceType: "github" | "local" | "symlink" | "unknown";
  origin: string;
  sourceUrl?: string;
  skillPath?: string;
  description?: string;
  version?: string;
  installedAt?: string;
  updatedAt?: string;
  note?: string;
}

export interface AgentEntry {
  tag: Tag;
  sourceType: "local";
  origin: string;
  description?: string;
  model?: string;
  tools?: string;
  note?: string;
}

export interface PluginEntry {
  tag: Tag;
  marketplace: string;
  plugin: string;
  version?: string;
  scope?: string;
  projectPath?: string;
  commit?: string;
  enabled?: boolean;
  installedAt?: string;
  updatedAt?: string;
  install: string;
}

export interface MarketplaceEntry {
  tag: Tag;
  sourceType: string;
  origin: string;
  ref?: string;
  install: string;
}

export interface HookEntry {
  event: string;
  matcher?: string;
  type: string;
  command: string;
  timeout?: number;
}

/** Sólo nombres de variables de entorno: los valores nunca salen de settings.json. */
export interface McpEntry {
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  envKeys?: string[];
  from: string;
}

export interface Manifest {
  version: number;
  generatedAt: string;
  marketplaces: Record<string, MarketplaceEntry>;
  plugins: Record<string, PluginEntry>;
  skills: Record<string, SkillEntry>;
  agents: Record<string, AgentEntry>;
  hooks: HookEntry[];
  mcpServers: Record<string, McpEntry>;
}

export function emptyManifest(): Manifest {
  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date(0).toISOString(),
    marketplaces: {},
    plugins: {},
    skills: {},
    agents: {},
    hooks: [],
    mcpServers: {},
  };
}

export async function loadManifest(file = p.manifest()): Promise<Manifest | null> {
  if (!(await exists(file))) return null;
  const raw = await readJson<Partial<Manifest> | null>(file, null);
  if (!raw || typeof raw !== "object") return null;
  return { ...emptyManifest(), ...raw } as Manifest;
}

/** Respalda el manifest anterior y escribe el nuevo. Devuelve la ruta del respaldo. */
export async function saveManifest(m: Manifest, file = p.manifest()): Promise<string | null> {
  const backedUp = await backup(file);
  await writeJson(file, m);
  return backedUp;
}

export interface DiffEntry {
  kind: "skill" | "agent" | "plugin" | "marketplace";
  name: string;
  change: "added" | "updated" | "removed-from-disk" | "tag-kept";
  detail?: string;
}

/**
 * Merge no destructivo: lo que escanea el disco manda sobre los datos
 * derivados, pero el `tag` que el usuario editó a mano y cualquier clave que
 * no produzca el escáner (por ejemplo `note`) sobreviven. Las entradas
 * declaradas en el manifest que no están en esta máquina NO se borran: el
 * manifest es portable entre máquinas y `sync` las va a necesitar.
 */
export function mergeSection<T extends { tag?: Tag }>(
  kind: DiffEntry["kind"],
  previous: Record<string, T>,
  scanned: Record<string, T>,
  diff: DiffEntry[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const name of Object.keys(scanned).sort()) {
    const fresh = scanned[name] as T;
    const old = previous[name];
    if (!old) {
      out[name] = fresh;
      diff.push({ kind, name, change: "added", detail: String(fresh.tag ?? "") });
      continue;
    }
    const merged = { ...old, ...fresh } as T;
    if (old.tag && old.tag !== fresh.tag) {
      merged.tag = old.tag;
      diff.push({ kind, name, change: "tag-kept", detail: `${String(fresh.tag)} → ${old.tag}` });
    }
    out[name] = merged;
    if (!sameJson(old, merged)) diff.push({ kind, name, change: "updated" });
  }
  for (const name of Object.keys(previous).sort()) {
    if (name in scanned) continue;
    out[name] = previous[name] as T;
    diff.push({ kind, name, change: "removed-from-disk" });
  }
  return sortKeys(out);
}

export function sortKeys<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = (obj as Record<string, unknown>)[k];
  return out as T;
}

export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Igualdad de manifests ignorando `generatedAt`: así `init` es idempotente. */
export function sameManifest(a: Manifest, b: Manifest): boolean {
  const strip = (m: Manifest) => ({ ...m, generatedAt: "" });
  return sameJson(strip(a), strip(b));
}
