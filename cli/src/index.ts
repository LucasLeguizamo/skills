#!/usr/bin/env node
import path from "node:path";
import { readFileSync } from "node:fs";
import { setColor } from "./lib/ansi.js";
import { HELP, IMPLEMENTED, parseCli, type Command } from "./lib/cli.js";
import { UserError, emitJson, fail, line } from "./lib/out.js";
import { runInit } from "./commands/init.js";
import { runList } from "./commands/list.js";
import { runExport } from "./commands/export.js";
import { runNew } from "./commands/new.js";

function version(): string {
  try {
    const pkg = readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf8");
    return (JSON.parse(pkg) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  let opts;
  try {
    opts = parseCli(argv);
  } catch (err) {
    fail(err, argv.includes("--json"));
  }
  if (!opts.color) setColor(false);

  if (opts.version) {
    if (opts.json) emitJson({ ok: true, version: version() });
    else line(version());
    return 0;
  }

  // `lucasleguizamo help <cmd>` y `lucasleguizamo <cmd> --help` son el mismo camino.
  const target: string =
    opts.command === "help" ? (opts.positionals[0] ?? "root") : opts.command;
  if (opts.help || opts.command === "help") {
    const text = HELP[target] ?? HELP.root ?? "";
    if (opts.json) emitJson({ ok: true, command: target, help: text });
    else line(text);
    return 0;
  }

  if (!IMPLEMENTED.has(opts.command as Command)) {
    throw new UserError(
      `\`lucasleguizamo ${opts.command}\` no implementado aún — llega en la próxima versión.\n` +
        "Disponibles hoy: init, list, export, new.",
      "not-implemented",
    );
  }

  switch (opts.command) {
    case "init":
      return runInit(opts);
    case "list":
      return runList(opts);
    case "export":
      return runExport(opts);
    case "new":
      return runNew(opts);
    default:
      line(HELP.root ?? "");
      return 0;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => fail(err, process.argv.includes("--json")));
