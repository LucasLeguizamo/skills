import path from "node:path";
import fs from "node:fs/promises";
import { p } from "./paths.js";
import { readJson, readText, listDirs, listFiles, findSkillFile } from "./fsx.js";
import { parseFrontmatter } from "./frontmatter.js";
import { seedFor, OWN_MARKETPLACE } from "./classify.js";
import type {
  AgentEntry,
  HookEntry,
  Manifest,
  MarketplaceEntry,
  McpEntry,
  PluginEntry,
  SkillEntry,
  Tag,
} from "./manifest.js";
import { emptyManifest, sortKeys } from "./manifest.js";

interface LockSkill {
  source?: string;
  sourceType?: string;
  sourceUrl?: string;
  skillPath?: string;
  skillFolderHash?: string;
  installedAt?: string;
  updatedAt?: string;
}

interface InstalledRecord {
  scope?: string;
  projectPath?: string;
  version?: string;
  installedAt?: string;
  lastUpdated?: string;
  gitCommitSha?: string;
}

interface Settings {
  hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ type?: string; command?: string; timeout?: number }> }>>;
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<string, { source?: Record<string, string> }>;
  mcpServers?: Record<string, { command?: string; args?: string[]; url?: string; type?: string; env?: Record<string, string> }>;
}

/** Foto de esta máquina. No escribe nada; `init` decide qué hacer con ella. */
export async function scanMachine(): Promise<Manifest> {
  const m = emptyManifest();
  const lock = await readJson<{ skills?: Record<string, LockSkill> }>(p.skillLock(), {});
  const lockSkills = lock.skills ?? {};

  m.skills = sortKeys(await scanSkills(lockSkills));
  m.agents = sortKeys(await scanAgents());

  const settings = await readJson<Settings>(p.settings(), {});
  const localSettings = await readJson<Settings>(path.join(path.dirname(p.settings()), "settings.local.json"), {});

  m.marketplaces = sortKeys(await scanMarketplaces(settings));
  m.plugins = sortKeys(await scanPlugins(settings));
  m.hooks = scanHooks(settings);
  m.mcpServers = sortKeys({
    ...collectMcp(settings, "settings.json"),
    ...collectMcp(localSettings, "settings.local.json"),
  });
  return m;
}

async function scanSkills(lockSkills: Record<string, LockSkill>): Promise<Record<string, SkillEntry>> {
  const dir = p.skillsDir();
  const out: Record<string, SkillEntry> = {};
  for (const name of await listDirs(dir)) {
    const full = path.join(dir, name);
    const lock = lockSkills[name];
    const link = await fs.lstat(full).then((s) => s.isSymbolicLink(), () => false);
    const file = await findSkillFile(full);
    const fm = file ? parseFrontmatter((await readText(file)) ?? "").data : {};

    let tag: Tag = "unknown";
    let sourceType: SkillEntry["sourceType"] = link ? "symlink" : "unknown";
    let origin = link ? await fs.realpath(full).catch(() => full) : "";

    if (lock) {
      tag = "vendor";
      sourceType = (lock.sourceType as SkillEntry["sourceType"]) ?? "github";
      origin = lock.source ?? origin;
    } else if (!link) {
      sourceType = "local";
      origin = `skills/${name}`;
    }

    const entry: SkillEntry = {
      tag,
      sourceType,
      origin: origin || "desconocido",
    };
    if (lock?.sourceUrl) entry.sourceUrl = lock.sourceUrl;
    if (lock?.skillPath) entry.skillPath = lock.skillPath;
    if (fm.description) entry.description = fm.description;
    const version = fm.version ?? lock?.skillFolderHash?.slice(0, 12);
    if (version) entry.version = version;
    if (lock?.installedAt) entry.installedAt = lock.installedAt;
    if (lock?.updatedAt) entry.updatedAt = lock.updatedAt;

    const seed = seedFor("skill", name);
    if (seed) {
      entry.tag = seed.tag;
      if (seed.note) entry.note = seed.note;
    }
    out[name] = entry;
  }
  return out;
}

async function scanAgents(): Promise<Record<string, AgentEntry>> {
  const dir = p.agentsDir();
  const out: Record<string, AgentEntry> = {};
  for (const file of await listFiles(dir, ".md")) {
    const name = file.replace(/\.md$/, "");
    const fm = parseFrontmatter((await readText(path.join(dir, file))) ?? "").data;
    const entry: AgentEntry = {
      tag: "unknown",
      sourceType: "local",
      origin: `agents/${file}`,
    };
    if (fm.description) entry.description = fm.description;
    if (fm.model) entry.model = fm.model;
    if (fm.tools) entry.tools = fm.tools;
    const seed = seedFor("agent", fm.name ?? name);
    if (seed) {
      entry.tag = seed.tag;
      if (seed.note) entry.note = seed.note;
    }
    out[fm.name ?? name] = entry;
  }
  return out;
}

async function scanMarketplaces(settings: Settings): Promise<Record<string, MarketplaceEntry>> {
  const known = await readJson<Record<string, { source?: Record<string, string> }>>(p.knownMarketplaces(), {});
  const all: Record<string, { source?: Record<string, string> }> = {
    ...(settings.extraKnownMarketplaces ?? {}),
    ...known,
  };
  const out: Record<string, MarketplaceEntry> = {};
  for (const [name, value] of Object.entries(all)) {
    const src = value.source ?? {};
    const origin = src.repo ?? src.url ?? src.path ?? "desconocido";
    const entry: MarketplaceEntry = {
      tag: name === OWN_MARKETPLACE ? "mine" : "vendor",
      sourceType: src.source ?? "unknown",
      origin,
      install: `claude plugin marketplace add ${origin}`,
    };
    if (src.ref) entry.ref = src.ref;
    out[name] = entry;
  }
  return out;
}

async function scanPlugins(settings: Settings): Promise<Record<string, PluginEntry>> {
  const installed = await readJson<{ plugins?: Record<string, InstalledRecord[]> }>(p.installedPlugins(), {});
  const enabled = settings.enabledPlugins ?? {};
  const out: Record<string, PluginEntry> = {};
  for (const [key, records] of Object.entries(installed.plugins ?? {})) {
    const [plugin = key, marketplace = ""] = key.split("@");
    // Preferimos el registro de alcance `user`: es el que se reinstala en otra máquina.
    const rec = records.find((r) => r.scope === "user") ?? records[0] ?? {};
    const entry: PluginEntry = {
      tag: marketplace === OWN_MARKETPLACE ? "mine" : "vendor",
      marketplace,
      plugin,
      install: `claude plugin install ${key}`,
    };
    if (rec.version) entry.version = rec.version;
    if (rec.scope) entry.scope = rec.scope;
    if (rec.scope !== "user" && rec.projectPath) entry.projectPath = rec.projectPath;
    if (rec.gitCommitSha) entry.commit = rec.gitCommitSha;
    if (key in enabled) entry.enabled = enabled[key] === true;
    if (rec.installedAt) entry.installedAt = rec.installedAt;
    if (rec.lastUpdated) entry.updatedAt = rec.lastUpdated;
    out[key] = entry;
  }
  return out;
}

function scanHooks(settings: Settings): HookEntry[] {
  const out: HookEntry[] = [];
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of groups ?? []) {
      for (const hook of group.hooks ?? []) {
        const entry: HookEntry = {
          event,
          type: hook.type ?? "command",
          command: hook.command ?? "",
        };
        if (group.matcher) entry.matcher = group.matcher;
        if (typeof hook.timeout === "number") entry.timeout = hook.timeout;
        out.push(entry);
      }
    }
  }
  return out.sort((a, b) => a.event.localeCompare(b.event));
}

/** Los valores de `env` nunca se copian: sólo los nombres de las variables. */
function collectMcp(settings: Settings, from: string): Record<string, McpEntry> {
  const out: Record<string, McpEntry> = {};
  for (const [name, server] of Object.entries(settings.mcpServers ?? {})) {
    const entry: McpEntry = {
      transport: server.type ?? (server.url ? "http" : "stdio"),
      from,
    };
    if (server.command) entry.command = server.command;
    if (server.args) entry.args = server.args;
    if (server.url) entry.url = server.url;
    const keys = Object.keys(server.env ?? {});
    if (keys.length) entry.envKeys = keys.sort();
    out[name] = entry;
  }
  return out;
}
