import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { overlayTags } from "../dist/commands/list.js";
import { scanMachine } from "../dist/lib/scan.js";
import { emptyManifest } from "../dist/lib/manifest.js";

/** ~/.claude falso: el escáner nunca toca el HOME real en los tests. */
async function fakeHome() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skills-scan-"));
  const claude = path.join(root, ".claude");
  const agents = path.join(root, ".agents");
  await fs.mkdir(path.join(claude, "skills", "mia"), { recursive: true });
  await fs.mkdir(path.join(claude, "skills", "ajena"), { recursive: true });
  await fs.mkdir(path.join(claude, "agents"), { recursive: true });
  await fs.mkdir(path.join(claude, "plugins"), { recursive: true });
  await fs.mkdir(agents, { recursive: true });
  await fs.writeFile(
    path.join(claude, "skills", "mia", "SKILL.md"),
    "---\nname: mia\ndescription: Hace algo propio. Úsala cuando pidan algo propio.\n---\ncuerpo\n",
  );
  await fs.writeFile(path.join(claude, "skills", "ajena", "SKILL.md"), "---\nname: ajena\n---\n");
  await fs.writeFile(path.join(claude, "agents", "revisor.md"), '---\nname: "revisor"\ndescription: "Revisa.\\nY nada más."\nmodel: sonnet\n---\n');
  await fs.writeFile(
    path.join(agents, ".skill-lock.json"),
    JSON.stringify({ version: 3, skills: { ajena: { source: "tercero/repo", sourceType: "github", skillFolderHash: "abcdef1234567890" } } }),
  );
  await fs.writeFile(
    path.join(claude, "plugins", "installed_plugins.json"),
    JSON.stringify({ version: 2, plugins: { "algo@market": [{ scope: "user", version: "1.2.3", gitCommitSha: "deadbeef" }] } }),
  );
  await fs.writeFile(
    path.join(claude, "plugins", "known_marketplaces.json"),
    JSON.stringify({ market: { source: { source: "github", repo: "alguien/market" } } }),
  );
  await fs.writeFile(
    path.join(claude, "settings.json"),
    JSON.stringify({
      enabledPlugins: { "algo@market": true },
      hooks: { Stop: [{ hooks: [{ type: "command", command: "echo hola", timeout: 5 }] }] },
      mcpServers: { n8n: { command: "pnpm", args: ["dlx", "n8n-mcp"], env: { API_KEY: "sec-r-eto" } } },
    }),
  );
  process.env.SKILLS_CLAUDE_HOME = claude;
  process.env.SKILLS_AGENTS_HOME = agents;
  return root;
}

test("scan: autoría, versión, hooks y MCP sin secretos", async (t) => {
  const root = await fakeHome();
  t.after(async () => {
    delete process.env.SKILLS_CLAUDE_HOME;
    delete process.env.SKILLS_AGENTS_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  const inv = await scanMachine();

  // el lockfile es la prueba de autoría de terceros
  assert.equal(inv.skills.ajena.tag, "vendor");
  assert.equal(inv.skills.ajena.origin, "tercero/repo");
  assert.equal(inv.skills.ajena.version, "abcdef123456");
  // sin lockfile y sin semilla: lo decide una persona
  assert.equal(inv.skills.mia.tag, "unknown");
  assert.equal(inv.skills.mia.sourceType, "local");

  // el escalar YAML entre comillas se desescapa
  assert.match(inv.agents.revisor.description, /Revisa\.\nY nada más\./);

  assert.equal(inv.plugins["algo@market"].version, "1.2.3");
  assert.equal(inv.plugins["algo@market"].enabled, true);
  assert.equal(inv.plugins["algo@market"].install, "claude plugin install algo@market");
  assert.equal(inv.marketplaces.market.origin, "alguien/market");
  assert.equal(inv.hooks.length, 1);
  assert.equal(inv.hooks[0].event, "Stop");

  assert.deepEqual(inv.mcpServers.n8n.envKeys, ["API_KEY"]);
  assert.equal(
    JSON.stringify(inv).includes("sec-r-eto"),
    false,
    "ningún valor de env puede salir del settings.json",
  );
});

test("list superpone los tags aprobados en el manifest", () => {
  const scanned = { ...emptyManifest(), skills: { x: { tag: "unknown", sourceType: "local", origin: "skills/x" } } };
  const manifest = { ...emptyManifest(), skills: { x: { tag: "mine", sourceType: "local", origin: "skills/x" } } };
  assert.equal(overlayTags(scanned, manifest).skills.x.tag, "mine");
});
