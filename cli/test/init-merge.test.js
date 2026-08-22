import test from "node:test";
import assert from "node:assert/strict";
import { mergeSection, sameManifest, emptyManifest } from "../dist/lib/manifest.js";

const scan = () => ({
  whiteboard: { tag: "mine", sourceType: "local", origin: "skills/whiteboard", version: "2" },
  "find-skills": { tag: "vendor", sourceType: "github", origin: "vercel-labs/skills" },
});

test("el tag editado a mano gana sobre el que deduce el escáner", () => {
  const diff = [];
  const previous = {
    "find-skills": { tag: "mine", sourceType: "github", origin: "vercel-labs/skills", note: "lo adopté" },
  };
  const out = mergeSection("skill", previous, scan(), diff);
  assert.equal(out["find-skills"].tag, "mine");
  assert.equal(out["find-skills"].note, "lo adopté", "las claves propias del usuario sobreviven");
  assert.ok(diff.some((d) => d.change === "tag-kept" && d.name === "find-skills"));
});

test("los datos derivados sí se refrescan", () => {
  const diff = [];
  const previous = { whiteboard: { tag: "mine", sourceType: "local", origin: "skills/whiteboard", version: "1" } };
  const out = mergeSection("skill", previous, scan(), diff);
  assert.equal(out.whiteboard.version, "2");
  assert.ok(diff.some((d) => d.change === "updated" && d.name === "whiteboard"));
});

test("lo declarado y ausente en esta máquina no se borra", () => {
  const diff = [];
  const previous = { "otra-maquina": { tag: "vendor", sourceType: "github", origin: "alguien/repo" } };
  const out = mergeSection("skill", previous, scan(), diff);
  assert.ok("otra-maquina" in out, "el manifest es portable: sync la va a necesitar");
  assert.ok(diff.some((d) => d.change === "removed-from-disk" && d.name === "otra-maquina"));
});

test("merge de lo mismo dos veces no produce diff (idempotencia)", () => {
  const first = mergeSection("skill", {}, scan(), []);
  const diff = [];
  const second = mergeSection("skill", first, scan(), diff);
  assert.deepEqual(second, first);
  assert.deepEqual(diff, []);
});

test("sameManifest ignora generatedAt", () => {
  const a = { ...emptyManifest(), generatedAt: "2026-01-01T00:00:00.000Z" };
  const b = { ...emptyManifest(), generatedAt: "2026-08-22T00:00:00.000Z" };
  assert.equal(sameManifest(a, b), true);
  b.skills = { x: { tag: "mine", sourceType: "local", origin: "skills/x" } };
  assert.equal(sameManifest(a, b), false);
});
