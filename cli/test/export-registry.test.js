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

/** El inglés vive en el frontmatter; el español, sólo en i18n/es.json. */
const ES = {
  whiteboard: {
    summary: "Dibuja diagramas por código y los publica",
    whenToUse: "Úsala cuando pidan un diagrama o un flujo.",
  },
  // A propósito sin `whenToUse`: la traducción parcial también es válida.
  skillsmith: { summary: "Autor de skills" },
  // Y `lucas-core` no está: un slug entero puede faltar.
};

async function fakeRepo({ es = ES } = {}) {
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
      description: "Packages Lucas's own skills. Nothing third-party.",
      repository: "https://github.com/lucasleguizamo/skills",
    }),
  );
  await fs.mkdir(path.join(plug, "skills", "whiteboard"), { recursive: true });
  await fs.writeFile(
    path.join(plug, "skills", "whiteboard", "SKILL.md"),
    "---\nname: whiteboard\ndescription: Draws diagrams from code and publishes them. Use when someone asks for a diagram or a flow.\n---\n",
  );
  await fs.mkdir(path.join(plug, "skills", "prestada"), { recursive: true });
  await fs.writeFile(path.join(plug, "skills", "prestada", "SKILL.md"), "---\nname: prestada\ndescription: From someone else.\n---\n");
  await fs.mkdir(path.join(plug, "agents"), { recursive: true });
  await fs.writeFile(
    path.join(plug, "agents", "skillsmith.md"),
    "---\nname: skillsmith\ndescription: >\n  Authors skills.\n  Use when something needs packaging.\n\n  <example>\n  user: \"dale\"\n  assistant: \"uso skillsmith\"\n  </example>\ntools: Read, Write\n---\n",
  );
  if (es) {
    await fs.mkdir(path.join(root, "i18n"), { recursive: true });
    await fs.writeFile(path.join(root, "i18n", "es.json"), JSON.stringify(es, null, 2) + "\n");
  }
  return root;
}

test("registry: forma del contrato, orden y sólo lo `mine`", async (t) => {
  const root = await fakeRepo();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const manifest = { ...emptyManifest(), skills: { prestada: { tag: "vendor", sourceType: "github", origin: "otro/repo" } } };
  const { registry, excluded } = await buildRegistry(root, manifest);

  assert.equal(registry.version, 2);
  assert.equal(registry.marketplace.name, "lucas");
  assert.equal(registry.marketplace.install, "/plugin marketplace add lucasleguizamo/skills");

  const slugs = registry.items.map((i) => i.slug);
  assert.deepEqual(slugs, ["skillsmith", "lucas-core", "whiteboard"], "orden estable: tipo y luego slug");
  assert.deepEqual(excluded, [{ slug: "prestada", type: "skill", tag: "vendor" }]);

  for (const item of registry.items) {
    assert.deepEqual(Object.keys(item), CLAVES, `${item.slug} debe respetar el esquema exacto`);
    assert.equal(item.version, "0.1.0");
    assert.ok(item.summary.en.length > 0 && !item.summary.en.endsWith("."), "summary es una línea sin punto final");
    assert.ok(!item.summary.en.includes("<example>"), "los <example> no van a la web");
  }

  const wb = registry.items.find((i) => i.slug === "whiteboard");
  assert.equal(wb.summary.en, "Draws diagrams from code and publishes them");
  assert.equal(wb.whenToUse.en, "Use when someone asks for a diagram or a flow.");
  assert.equal(wb.install, "/plugin install lucas-core@lucas");
  assert.equal(
    wb.source,
    "https://github.com/lucasleguizamo/skills/blob/main/plugins/lucas-core/skills/whiteboard/SKILL.md",
  );

  const smith = registry.items.find((i) => i.slug === "skillsmith");
  assert.equal(smith.type, "agent");
  assert.equal(smith.whenToUse.en, "Use when something needs packaging.");
});

test("registry v2: summary y whenToUse son { en, es } en TODOS los ítems", async (t) => {
  const root = await fakeRepo();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { registry, missingEs } = await buildRegistry(root, null);

  for (const item of registry.items) {
    for (const field of ["summary", "whenToUse"]) {
      const v = item[field];
      assert.equal(typeof v, "object", `${item.slug}.${field} debe ser un objeto`);
      assert.deepEqual(Object.keys(v), ["en", "es"], `${item.slug}.${field} lleva exactamente en y es`);
      assert.equal(typeof v.en, "string");
      assert.equal(typeof v.es, "string");
      assert.equal(v.es === "", v.en === "", `${item.slug}.${field}.es no puede quedar vacío si hay inglés`);
    }
  }

  const wb = registry.items.find((i) => i.slug === "whiteboard");
  assert.deepEqual(wb.summary, { en: "Draws diagrams from code and publishes them", es: ES.whiteboard.summary });
  assert.deepEqual(wb.whenToUse, { en: "Use when someone asks for a diagram or a flow.", es: ES.whiteboard.whenToUse });
  // Sin manifest entra también `prestada`, que tampoco está en es.json.
  assert.deepEqual(missingEs, ["lucas-core.summary", "prestada.summary", "skillsmith.whenToUse"]);
});

test("registry v2: sin traducción el `es` cae al inglés y el export no falla", async (t) => {
  const conParcial = await fakeRepo();
  t.after(() => fs.rm(conParcial, { recursive: true, force: true }));
  const parcial = await buildRegistry(conParcial, null);

  // Campo suelto sin traducir: el resto del slug sí está traducido.
  const smith = parcial.registry.items.find((i) => i.slug === "skillsmith");
  assert.equal(smith.summary.es, "Autor de skills");
  assert.equal(smith.whenToUse.es, smith.whenToUse.en);

  // Slug entero ausente de es.json.
  const core = parcial.registry.items.find((i) => i.slug === "lucas-core");
  assert.equal(core.summary.es, core.summary.en);
  assert.equal(core.whenToUse.en, "");
  assert.equal(core.whenToUse.es, "");
  assert.equal(parcial.missingEs.includes("lucas-core.whenToUse"), false, "sin inglés no hay hueco que reportar");

  // Sin archivo, y con un archivo corrupto: todo en inglés, cero excepciones.
  for (const roto of [null, "{ esto no es JSON", JSON.stringify(["array"]), JSON.stringify({ whiteboard: 42 })]) {
    const root = await fakeRepo({ es: null });
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    if (roto !== null) {
      await fs.mkdir(path.join(root, "i18n"), { recursive: true });
      await fs.writeFile(path.join(root, "i18n", "es.json"), roto);
    }
    const { registry, missingEs } = await buildRegistry(root, null);
    assert.equal(registry.items.length, 4);
    for (const item of registry.items) {
      assert.equal(item.summary.es, item.summary.en, `${item.slug}: fallback al inglés`);
      assert.equal(item.whenToUse.es, item.whenToUse.en, `${item.slug}: fallback al inglés`);
    }
    assert.ok(missingEs.length > 0, "los huecos se reportan, no se esconden");
  }
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
