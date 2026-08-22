import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { findRepoRoot } from "../lib/paths.js";
import { listDirs, listFiles, readJson, readText, writeJson, findSkillFile, exists } from "../lib/fsx.js";
import { parseFrontmatter, splitDescription, firstSentence } from "../lib/frontmatter.js";
import { loadManifest, type Manifest } from "../lib/manifest.js";
import { UserError, emitJson, heading, line, note, table } from "../lib/out.js";
import { cyan, green } from "../lib/ansi.js";
import type { Parsed } from "../lib/cli.js";

const exec = promisify(execFile);

export const REGISTRY_VERSION = 1;

/** Contrato con lucasleguizamo.com/stack. Ver el README del CLI. */
export interface RegistryItem {
  slug: string;
  type: "skill" | "agent" | "plugin";
  name: string;
  summary: string;
  whenToUse: string;
  category: string;
  source: string;
  install: string;
  version: string;
  updatedAt: string;
}

export interface Registry {
  version: number;
  generatedAt: string;
  marketplace: { name: string; install: string };
  items: RegistryItem[];
}

interface MarketplaceFile {
  name?: string;
  owner?: { url?: string };
  plugins?: Array<{ name?: string; source?: string; description?: string; category?: string }>;
}

interface PluginFile {
  name?: string;
  version?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  category?: string;
}

export interface BuildResult {
  registry: Registry;
  excluded: Array<{ slug: string; type: string; tag: string }>;
}

/**
 * Sólo entra lo `mine`. Lo empaquetado en este repo es propio por
 * definición (es el marketplace de Lucas), así que su tag efectivo es "mine"
 * salvo que el manifest lo degrade explícitamente a vendor/unknown.
 */
export function effectiveTag(manifest: Manifest | null, type: string, name: string): string {
  if (!manifest) return "mine";
  const bag = type === "skill" ? manifest.skills : type === "agent" ? manifest.agents : null;
  const entry = bag?.[name] as { tag?: string } | undefined;
  return entry?.tag ?? "mine";
}

export async function buildRegistry(repoRoot: string, manifest: Manifest | null): Promise<BuildResult> {
  const mkFile = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const mk = await readJson<MarketplaceFile | null>(mkFile, null);
  if (!mk?.name) throw new UserError(`no encontré un marketplace válido en ${mkFile}`, "no-marketplace");

  const ref = process.env.SKILLS_REF ?? "main";
  const items: RegistryItem[] = [];
  const excluded: BuildResult["excluded"] = [];
  const slugs = new Set<string>();
  let marketplaceRepo = ownerRepo(mk.owner?.url ?? "");

  const claim = (slug: string, type: string) => {
    if (!slugs.has(slug)) {
      slugs.add(slug);
      return slug;
    }
    const alt = `${type}-${slug}`;
    slugs.add(alt);
    return alt;
  };

  for (const declared of mk.plugins ?? []) {
    const rel = (declared.source ?? "").replace(/^\.\//, "");
    if (!rel) continue;
    const pluginDir = path.join(repoRoot, rel);
    const pj = await readJson<PluginFile | null>(path.join(pluginDir, ".claude-plugin", "plugin.json"), null);
    if (!pj?.name) continue;
    const version = pj.version ?? "0.0.0";
    const repoBase = (pj.repository ?? pj.homepage ?? "").replace(/\.git$/, "").replace(/#.*$/, "");
    if (repoBase) marketplaceRepo = ownerRepo(repoBase);
    const category = declared.category ?? pj.category ?? "productivity";
    const install = `/plugin install ${pj.name}@${mk.name}`;
    const srcUrl = (p2: string) => (repoBase ? `${repoBase}/blob/${ref}/${p2}` : p2);

    const pluginDesc = pj.description ?? declared.description ?? "";
    items.push({
      slug: claim(pj.name, "plugin"),
      type: "plugin",
      name: pj.name,
      summary: firstSentence(pluginDesc),
      whenToUse: splitDescription(pluginDesc).whenToUse,
      category,
      source: srcUrl(path.posix.join(rel, ".claude-plugin", "plugin.json")),
      install,
      version,
      updatedAt: await lastChanged(repoRoot, pluginDir),
    });

    for (const dirName of await listDirs(path.join(pluginDir, "skills"))) {
      const skillDir = path.join(pluginDir, "skills", dirName);
      const file = await findSkillFile(skillDir);
      if (!file) continue;
      const fm = parseFrontmatter((await readText(file)) ?? "").data;
      const name = fm.name ?? dirName;
      const tag = effectiveTag(manifest, "skill", name);
      if (tag !== "mine") {
        excluded.push({ slug: name, type: "skill", tag });
        continue;
      }
      const { summary, whenToUse } = splitDescription(fm.description ?? "");
      items.push({
        slug: claim(name, "skill"),
        type: "skill",
        name,
        summary,
        whenToUse,
        category: fm.category ?? category,
        source: srcUrl(path.posix.join(rel, "skills", dirName, path.basename(file))),
        install,
        version,
        updatedAt: await lastChanged(repoRoot, skillDir),
      });
    }

    for (const fileName of await listFiles(path.join(pluginDir, "agents"), ".md")) {
      const agentFile = path.join(pluginDir, "agents", fileName);
      const fm = parseFrontmatter((await readText(agentFile)) ?? "").data;
      const name = fm.name ?? fileName.replace(/\.md$/, "");
      const tag = effectiveTag(manifest, "agent", name);
      if (tag !== "mine") {
        excluded.push({ slug: name, type: "agent", tag });
        continue;
      }
      const { summary, whenToUse } = splitDescription(fm.description ?? "");
      items.push({
        slug: claim(name, "agent"),
        type: "agent",
        name,
        summary,
        whenToUse,
        category: fm.category ?? category,
        source: srcUrl(path.posix.join(rel, "agents", fileName)),
        install,
        version,
        updatedAt: await lastChanged(repoRoot, agentFile),
      });
    }
  }

  items.sort((a, b) => a.type.localeCompare(b.type) || a.slug.localeCompare(b.slug));

  // generatedAt = el updatedAt más reciente, no la hora del reloj: exportar
  // dos veces sobre el mismo commit produce bytes idénticos.
  const generatedAt = items.reduce((max, it) => (it.updatedAt > max ? it.updatedAt : max), "1970-01-01T00:00:00Z");

  return {
    registry: {
      version: REGISTRY_VERSION,
      generatedAt,
      marketplace: { name: mk.name, install: `/plugin marketplace add ${marketplaceRepo}` },
      items,
    },
    excluded,
  };
}

/** https://github.com/owner/repo → owner/repo, que es lo que acepta
 *  `/plugin marketplace add`. Si la URL no es de GitHub la deja como está. */
function ownerRepo(url: string): string {
  const m = /github\.com[/:]([^/]+\/[^/]+)/.exec(url);
  return m?.[1] ?? url.replace(/\/$/, "");
}

/** Fecha del último commit que tocó la ruta; si no hay git, el mtime. */
async function lastChanged(repoRoot: string, target: string): Promise<string> {
  try {
    const { stdout } = await exec("git", ["log", "-1", "--format=%cI", "--", target], { cwd: repoRoot });
    const iso = stdout.trim();
    if (iso) return new Date(iso).toISOString();
  } catch {
    /* sin git: caemos al mtime */
  }
  const st = await fs.stat(target).catch(() => null);
  return (st?.mtime ?? new Date(0)).toISOString();
}

export async function runExport(opts: Parsed): Promise<number> {
  const repoRoot = findRepoRoot();
  if (!repoRoot) {
    throw new UserError(
      "no encontré un repo de marketplace (.claude-plugin/marketplace.json) desde este directorio.\n" +
        "Corré el comando dentro del repo `skills`, o exportá SKILLS_REPO=/ruta/al/repo.",
      "no-repo",
    );
  }
  const manifest = await loadManifest();
  const { registry, excluded } = await buildRegistry(repoRoot, manifest);
  const out = path.resolve(opts.out ?? path.join(repoRoot, "registry.json"));

  const before = (await exists(out)) ? await readText(out) : null;
  await writeJson(out, registry);
  const unchanged = before === JSON.stringify(registry, null, 2) + "\n";

  if (opts.json) {
    emitJson({ ok: true, out, count: registry.items.length, unchanged, excluded, registry });
    return 0;
  }

  heading(`registry.json — ${registry.items.length} elementos`);
  table(
    registry.items.map((i) => [i.slug, i.type, i.version, i.summary.slice(0, 60)]),
    ["slug", "tipo", "versión", "resumen"],
  );
  if (excluded.length) {
    heading("Excluidos (no son `mine` en el manifest)");
    table(excluded.map((e) => [e.slug, e.type, e.tag]));
  }
  line();
  line(`${green(unchanged ? "sin cambios" : "escrito")} ${cyan(out)}`);
  note("Copialo a src/data/registry.json del portafolio y commitealo.");
  return 0;
}
