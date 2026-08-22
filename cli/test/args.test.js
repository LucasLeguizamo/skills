import test from "node:test";
import assert from "node:assert/strict";
import { parseCli, IMPLEMENTED, COMMANDS } from "../dist/lib/cli.js";

test("parseCli: comando + positionales + flags", () => {
  const p = parseCli(["new", "skill", "mi-skill", "--json", "--out", "/tmp/x"]);
  assert.equal(p.command, "new");
  assert.deepEqual(p.positionals, ["skill", "mi-skill"]);
  assert.equal(p.json, true);
  assert.equal(p.out, "/tmp/x");
  assert.equal(p.dryRun, false);
});

test("parseCli: --dry-run y --no-color", () => {
  const p = parseCli(["init", "--dry-run", "--no-color"]);
  assert.equal(p.dryRun, true);
  assert.equal(p.color, false);
});

test("parseCli: sin argumentos cae en help", () => {
  assert.equal(parseCli([]).command, "help");
  assert.equal(parseCli(["--version"]).version, true);
});

test("parseCli: comando desconocido y flag desconocida fallan", () => {
  assert.throws(() => parseCli(["nope"]), /comando desconocido/);
  assert.throws(() => parseCli(["list", "--nope"]), /--help/);
});

test("los comandos de fase 3 se declaran pero no están implementados", () => {
  for (const c of ["add", "remove", "sync", "doctor"]) {
    assert.ok(COMMANDS.includes(c), `${c} debe existir para poder rechazarlo con un mensaje claro`);
    assert.equal(IMPLEMENTED.has(c), false);
  }
  for (const c of ["init", "list", "export", "new"]) {
    assert.equal(IMPLEMENTED.has(c), true);
  }
});
