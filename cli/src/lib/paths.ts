import { homedir } from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Todas las rutas salen de acá para que los tests puedan apuntar a un HOME
 * falso: SKILLS_CLAUDE_HOME y SKILLS_AGENTS_HOME ganan sobre el HOME real.
 */
export function claudeHome(): string {
  return process.env.SKILLS_CLAUDE_HOME ?? path.join(homedir(), ".claude");
}

/** Lockfile de `npx skills add` (skills.sh): la fuente dura de autoría. */
export function agentsHome(): string {
  return process.env.SKILLS_AGENTS_HOME ?? path.join(homedir(), ".agents");
}

export const p = {
  manifest: () => path.join(claudeHome(), "skills.json"),
  backupsDir: () => path.join(claudeHome(), ".skills-backup"),
  skillsDir: () => path.join(claudeHome(), "skills"),
  agentsDir: () => path.join(claudeHome(), "agents"),
  settings: () => path.join(claudeHome(), "settings.json"),
  installedPlugins: () => path.join(claudeHome(), "plugins", "installed_plugins.json"),
  knownMarketplaces: () => path.join(claudeHome(), "plugins", "known_marketplaces.json"),
  skillLock: () => path.join(agentsHome(), ".skill-lock.json"),
};

/**
 * Raíz del repo de plugins: se busca hacia arriba desde `from` un
 * `.claude-plugin/marketplace.json`. SKILLS_REPO la fuerza.
 */
export function findRepoRoot(from = process.cwd()): string | null {
  if (process.env.SKILLS_REPO) return process.env.SKILLS_REPO;
  let dir = path.resolve(from);
  for (;;) {
    if (existsSync(path.join(dir, ".claude-plugin", "marketplace.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
