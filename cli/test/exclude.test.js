import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyExclusions, isExcluded, emptyManifest } from "../dist/lib/manifest.js";
import { DEFAULT_EXCLUDE } from "../dist/lib/classify.js";

const BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

/** ~/.claude falso con un MCP con secreto y un par de skills. */
async function fakeHome() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skills-excl-"));
  const claude = path.join(root, ".claude");
  const agents = path.join(root, ".agents");
  await fs.mkdir(path.join(claude, "skills", "mia"), { recursive: true });
  await fs.mkdir(path.join(claude, "skills", "prestada"), { recursive: true });
  await fs.mkdir(path.join(claude, "agents"), { recursive: true });
  await fs.mkdir(path.join(claude, "plugins"), { recursive: true });
  await fs.mkdir(agents, { recursive: true });
  await fs.writeFile(path.join(claude, "skills", "mia", "SKILL.md"), "---\nname: mia\ndescription: Hace algo.\n---\n");
  await fs.writeFile(path.join(claude, "skills", "prestada", "SKILL.md"), "---\nname: prestada\ndescription: De otro.\n---\n");
  await fs.writeFile(path.join(claude, "agents", "revisor.md"), "---\nname: revisor\ndescription: Revisa.\n---\n");
  await fs.writeFile(path.join(agents, ".skill-lock.json"), JSON.stringify({ version: 3, skills: {} }));
  await fs.writeFile(path.join(claude, "plugins", "installed_plugins.json"), JSON.stringify({ version: 2, plugins: {} }));
  await fs.writeFile(path.join(claude, "plugins", "known_marketplaces.json"), JSON.stringify({}));
  await fs.writeFile(
    path.join(claude, "settings.json"),
    JSON.stringify({ mcpServers: { n8n: { command: "pnpm", args: ["dlx", "n8n-mcp"], env: { N8N_API_KEY: "sec-r-eto" } } } }),
  );
  return { root, claude, agents };
}

async function fakeRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skills-excl-repo-"));
  await fs.mkdir(path.join(root, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "lucas", plugins: [{ name: "lucas-core", source: "./plugins/lucas-core" }] }),
  );
  const plug = path.join(root, "plugins", "lucas-core");
  await fs.mkdir(path.join(plug, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(plug, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "lucas-core", version: "0.1.0", description: "Empaqueta lo propio.", repository: "https://github.com/lucasleguizamo/skills" }),
  );
  for (const s of ["whiteboard", "pm-agent"]) {
    await fs.mkdir(path.join(plug, "skills", s), { recursive: true });
    await fs.writeFile(path.join(plug, "skills", s, "SKILL.md"), `---\nname: ${s}\ndescription: Hace algo. Úsala cuando toque.\n---\n`);
  }
  return root;
}

function run(args, env) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env } });
}

test("la semilla de exclude apaga el MCP n8n", () => {
  assert.deepEqual(DEFAULT_EXCLUDE, ["mcp:n8n"]);
});

test("isExcluded acepta `<tipo>:<nombre>` y el nombre pelado", () => {
  assert.equal(isExcluded(["mcp:n8n"], "mcp", "n8n"), true);
  assert.equal(isExcluded(["n8n"], "mcp", "n8n"), true);
  assert.equal(isExcluded(["mcp:n8n"], "skill", "n8n"), false, "el prefijo acota el tipo");
  assert.equal(isExcluded([], "mcp", "n8n"), false);
  assert.equal(isExcluded(undefined, "mcp", "n8n"), false);
});

test("applyExclusions borra de todas las secciones y cuenta", () => {
  const m = emptyManifest();
  m.skills = { mia: { tag: "mine" }, prestada: { tag: "vendor" } };
  m.mcpServers = { n8n: { transport: "stdio" }, otro: { transport: "stdio" } };
  assert.equal(applyExclusions(m, ["mcp:n8n", "prestada"]), 2);
  assert.deepEqual(Object.keys(m.skills), ["mia"]);
  assert.deepEqual(Object.keys(m.mcpServers), ["otro"]);
});

test("init: siembra exclude, deja el MCP fuera del manifest y no lo pisa después", async (t) => {
  const { root, claude, agents } = await fakeHome();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const env = { SKILLS_CLAUDE_HOME: claude, SKILLS_AGENTS_HOME: agents };

  const first = run(["init", "--json"], env);
  assert.equal(first.status, 0, first.stderr);
  const out = JSON.parse(first.stdout);
  assert.equal(out.wrote, true);
  assert.equal(out.excluded, 1);
  assert.deepEqual(out.manifest.exclude, ["mcp:n8n"]);
  assert.deepEqual(out.manifest.mcpServers, {});
  // El nombre sólo puede aparecer dentro del propio array `exclude`.
  const sinRegla = { ...out.manifest, exclude: undefined };
  assert.equal(JSON.stringify(sinRegla).includes("n8n"), false, "un ítem excluido no puede entrar al manifest");

  const escrito = JSON.parse(await fs.readFile(path.join(claude, "skills.json"), "utf8"));
  assert.deepEqual(escrito.mcpServers, {});
  assert.equal(JSON.stringify(escrito).includes("sec-r-eto"), false, "ningún secreto en el manifest");

  // Idempotencia: la segunda corrida no escribe.
  const second = JSON.parse(run(["init", "--json"], env).stdout);
  assert.equal(second.wrote, false);
  assert.equal(second.excluded, 1);

  // El usuario edita exclude a mano: init lo respeta tal cual.
  escrito.exclude = ["mcp:n8n", "skill:prestada"];
  await fs.writeFile(path.join(claude, "skills.json"), JSON.stringify(escrito, null, 2) + "\n");
  const third = JSON.parse(run(["init", "--json"], env).stdout);
  assert.deepEqual(third.manifest.exclude, ["mcp:n8n", "skill:prestada"], "init no pisa el exclude del usuario");
  assert.equal("prestada" in third.manifest.skills, false);
  assert.equal(third.excluded, 2);

  // Y no vuelve a colarse como "declarada en otra máquina" en el merge siguiente.
  const fourth = JSON.parse(run(["init", "--json"], env).stdout);
  assert.equal("prestada" in fourth.manifest.skills, false);
  assert.equal(fourth.wrote, false, "seguir excluyendo no genera escrituras nuevas");
});

test("list: lo excluido no aparece, sólo se cuenta", async (t) => {
  const { root, claude, agents } = await fakeHome();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const env = { SKILLS_CLAUDE_HOME: claude, SKILLS_AGENTS_HOME: agents };

  run(["init"], env);
  const manifestPath = path.join(claude, "skills.json");
  const m = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  m.exclude = ["mcp:n8n", "skill:prestada", "agent:revisor"];
  await fs.writeFile(manifestPath, JSON.stringify(m, null, 2) + "\n");

  const json = run(["list", "--json"], env);
  assert.equal(json.status, 0, json.stderr);
  const inv = JSON.parse(json.stdout);
  assert.equal(inv.excluded, 3);
  for (const nombre of ["n8n", "prestada", "revisor"]) {
    assert.equal(json.stdout.includes(nombre), false, `"${nombre}" está excluido y no puede salir en list --json`);
  }
  assert.ok("mia" in inv.skills, "lo no excluido sigue estando");

  const humano = run(["list"], env);
  for (const nombre of ["n8n", "prestada", "revisor"]) {
    assert.equal(humano.stdout.includes(nombre), false, `"${nombre}" no puede salir en la tabla de list`);
  }
  assert.match(humano.stdout, /3 ítem\(s\) fuera/);
});

test("export: lo excluido no entra al registry y el archivo sigue siendo estable", async (t) => {
  const { root, claude, agents } = await fakeHome();
  const repo = await fakeRepo();
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(repo, { recursive: true, force: true });
  });
  const env = { SKILLS_CLAUDE_HOME: claude, SKILLS_AGENTS_HOME: agents, SKILLS_REPO: repo };

  run(["init"], env);
  const manifestPath = path.join(claude, "skills.json");
  const m = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  m.exclude = ["mcp:n8n", "skill:whiteboard"];
  await fs.writeFile(manifestPath, JSON.stringify(m, null, 2) + "\n");

  const first = run(["export", "--json"], env);
  assert.equal(first.status, 0, first.stderr);
  const res = JSON.parse(first.stdout);
  assert.equal(res.excludedByRule, 1);
  assert.equal(first.stdout.includes("whiteboard"), false, "un ítem excluido no puede llegar al registry");
  assert.deepEqual(res.registry.items.map((i) => i.slug).sort(), ["lucas-core", "pm-agent"]);

  const bytes = await fs.readFile(path.join(repo, "registry.json"), "utf8");
  const second = JSON.parse(run(["export", "--json"], env).stdout);
  assert.equal(second.unchanged, true, "exportar dos veces da bytes idénticos");
  assert.equal(await fs.readFile(path.join(repo, "registry.json"), "utf8"), bytes);
});
