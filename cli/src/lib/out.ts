import { bold, dim, red, yellow } from "./ansi.js";

/** Salida JSON canónica: todo comando la soporta y siempre tiene la misma forma. */
export function emitJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function line(s = ""): void {
  process.stdout.write(s + "\n");
}

export function heading(s: string): void {
  line();
  line(bold(s));
}

export function note(s: string): void {
  line(dim(s));
}

export function warn(s: string): void {
  process.stderr.write(yellow("aviso: ") + s + "\n");
}

/** Error de usuario: mensaje en stderr, o JSON si el comando corre con --json. */
export class UserError extends Error {
  readonly code: string;
  constructor(message: string, code = "error") {
    super(message);
    this.code = code;
  }
}

export function fail(err: unknown, json: boolean): never {
  const message = err instanceof Error ? err.message : String(err);
  const code = err instanceof UserError ? err.code : "error";
  if (json) emitJson({ ok: false, code, error: message });
  else process.stderr.write(red("error: ") + message + "\n");
  process.exit(1);
}

/** Tabla de ancho fijo, sin dependencias. Columnas vacías se colapsan. */
export function table(rows: string[][], headers?: string[]): void {
  const all = headers ? [headers, ...rows] : rows;
  if (all.length === 0) return;
  const cols = Math.max(...all.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(...all.map((r) => (r[c] ?? "").length));
  }
  const render = (r: string[]) =>
    r
      .map((cell, c) => (c === cols - 1 ? cell : cell.padEnd(widths[c] ?? 0)))
      .join("  ")
      .trimEnd();
  if (headers) {
    line(dim(render(headers)));
  }
  for (const r of rows) line(render(r));
}
