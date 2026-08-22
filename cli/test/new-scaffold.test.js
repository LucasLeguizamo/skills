import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { planNew, KEBAB } from "../dist/commands/new.js";
import { parseFrontmatter } from "../dist/lib/frontmatter.js";

const BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

function run(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
}

test("el nombre debe ser kebab-case: es el identificador que invoca Claude Code", () => {
  assert.ok(KEBAB.test("mi-skill-2"));
  for (const malo of ["Mi_Skill", "miSkill", "-x", "x-", "con espacio"]) {
    assert.equal(KEBAB.test(malo), false, malo);
    assert.throws(() => planNew("skill", malo, "/tmp"), /kebab-case/);
  }
});

test("new skill: frontmatter válido, name = directorio, description con disparador", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "skills-new-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  const r = run(["new", "skill", "mi-skill", "--out", base, "--json"], base);
  assert.equal(r.status, 0, r.stderr);
  const created = JSON.parse(r.stdout).created;
  assert.deepEqual(created, [path.join(base, "skills", "mi-skill", "SKILL.md")]);

  const { data, body } = parseFrontmatter(await fs.readFile(created[0], "utf8"));
  assert.equal(data.name, "mi-skill", "el name tiene que coincidir con el directorio");
  assert.match(data.description, /Úsala cuando/);
  assert.ok(body.includes("## Cuándo usarla"));
});

test("new agent: description con dos <example> y tools", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "skills-new-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  const r = run(["new", "agent", "mi-agente", "--out", base, "--json"], base);
  assert.equal(r.status, 0, r.stderr);
  const file = JSON.parse(r.stdout).created[0];
  const { data } = parseFrontmatter(await fs.readFile(file, "utf8"));
  assert.equal(data.name, "mi-agente");
  assert.equal((data.description.match(/<example>/g) ?? []).length, 2);
  assert.ok(data.tools.includes("Read"));
});

test("new plugin: .claude-plugin/plugin.json con nombre y versión", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "skills-new-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  const r = run(["new", "plugin", "mi-plugin", "--out", base, "--json"], base);
  assert.equal(r.status, 0, r.stderr);
  const pj = JSON.parse(await fs.readFile(path.join(base, "mi-plugin", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(pj.name, "mi-plugin");
  assert.equal(pj.version, "0.1.0");
  assert.equal(pj.license, "MIT");
});

test("new se niega a sobreescribir y sale con código 1", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "skills-new-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  assert.equal(run(["new", "skill", "dup", "--out", base], base).status, 0);
  const antes = await fs.readFile(path.join(base, "skills", "dup", "SKILL.md"), "utf8");

  const segunda = run(["new", "skill", "dup", "--out", base, "--json"], base);
  assert.equal(segunda.status, 1);
  assert.equal(JSON.parse(segunda.stdout).code, "exists");

  const despues = await fs.readFile(path.join(base, "skills", "dup", "SKILL.md"), "utf8");
  assert.equal(despues, antes, "el archivo existente no se toca");
});
