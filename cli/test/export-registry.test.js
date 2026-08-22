import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildRegistry } from "../dist/commands/export.js";
import { emptyManifest } from "../dist/lib/manifest.js";

/** Contrato con lucasleguizamo.com/stack: si cambia, la web se rompe. */
const CLAVES = [
  "slug",
  "type",
  "name",
  "summary",
  "whenToUse",
  "category",
  "source",
  "install",
  "version",
  "updatedAt",
];

async function fakeRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "skills-repo-"));
  await fs.mkdir(path.join(root, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({
      name: "lucas",
      owner: { url: "https://github.com/lucasleguizamo" },
      plugins: [{ name: "lucas-core", source: "./plugins/lucas-core", category: "productivity" }],
    }),
  );
  const plug = path.join(root, "plugins", "lucas-core");
  await fs.mkdir(path.join(plug, ".claude-plugin"), { recursive: true });
  await fs.writeFile(
    path.join(plug, ".claude-plugin", "plugin.json"),
    JSON.stringify({
      name: "lucas-core",
      version: "0.1.0",
      description: "Empaqueta las skills propias. Nada de terceros.",
      repository: "https://github.com/lucasleguizamo/skills",
    }),
  );
  await fs.mkdir(path.join(plug, "skills", "whiteboard"), { recursive: true });
  await fs.writeFile(
    path.join(plug, "skills", "whiteboard", "SKILL.md"),
    "---\nname: whiteboard\ndescription: Dibuja diagramas por código y los publica. Úsala cuando pidan un diagrama o un flujo.\n---\n",
  );
  await fs.mkdir(path.join(plug, "skills", "prestada"), { recursive: true });
  await fs.writeFile(path.join(plug, "skills", "prestada", "SKILL.md"), "---\nname: prestada\ndescription: De otro.\n---\n");
  await fs.mkdir(path.join(plug, "agents"), { recursive: true });
  await fs.writeFile(
    path.join(plug, "agents", "skillsmith.md"),
    "---\nname: skillsmith\ndescription: >\n  Autor de skills.\n  Úsalo cuando haya que empaquetar algo.\n\n  <example>\n  user: \"dale\"\n  assistant: \"uso skillsmith\"\n  </example>\ntools: Read, Write\n---\n",
  );
  return root;
}

test("registry: forma del contrato, orden y sólo lo `mine`", async (t) => {
  const root = await fakeRepo();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const manifest = { ...emptyManifest(), skills: { prestada: { tag: "vendor", sourceType: "github", origin: "otro/repo" } } };
  const { registry, excluded } = await buildRegistry(root, manifest);

  assert.equal(registry.version, 1);
  assert.equal(registry.marketplace.name, "lucas");
  assert.equal(registry.marketplace.install, "/plugin marketplace add lucasleguizamo/skills");

  const slugs = registry.items.map((i) => i.slug);
  assert.deepEqual(slugs, ["skillsmith", "lucas-core", "whiteboard"], "orden estable: tipo y luego slug");
  assert.deepEqual(excluded, [{ slug: "prestada", type: "skill", tag: "vendor" }]);

  for (const item of registry.items) {
    assert.deepEqual(Object.keys(item), CLAVES, `${item.slug} debe respetar el esquema exacto`);
    assert.equal(item.version, "0.1.0");
    assert.ok(item.summary.length > 0 && !item.summary.endsWith("."), "summary es una línea sin punto final");
    assert.ok(!item.summary.includes("<example>"), "los <example> no van a la web");
  }

  const wb = registry.items.find((i) => i.slug === "whiteboard");
  assert.equal(wb.summary, "Dibuja diagramas por código y los publica");
  assert.equal(wb.whenToUse, "Úsala cuando pidan un diagrama o un flujo.");
  assert.equal(wb.install, "/plugin install lucas-core@lucas");
  assert.equal(
    wb.source,
    "https://github.com/lucasleguizamo/skills/blob/main/plugins/lucas-core/skills/whiteboard/SKILL.md",
  );

  const smith = registry.items.find((i) => i.slug === "skillsmith");
  assert.equal(smith.type, "agent");
  assert.equal(smith.whenToUse, "Úsalo cuando haya que empaquetar algo.");
});

test("registry: exportar dos veces da bytes idénticos", async (t) => {
  const root = await fakeRepo();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const a = await buildRegistry(root, null);
  const b = await buildRegistry(root, null);
  assert.equal(JSON.stringify(a.registry), JSON.stringify(b.registry));
  assert.equal(a.registry.generatedAt, a.registry.items.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), ""));
});

test("registry: sin manifest todo lo del repo propio es `mine`", async (t) => {
  const root = await fakeRepo();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { registry, excluded } = await buildRegistry(root, null);
  assert.equal(excluded.length, 0);
  assert.equal(registry.items.length, 4);
});
