import fs from "node:fs/promises";
import path from "node:path";
import { p } from "./paths.js";

export async function exists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

/** JSON con newline final y 2 espacios: diffs limpios en git. */
export async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Marca de tiempo apta para nombre de carpeta: 2026-08-21T14-05-09-123Z */
export function stamp(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

/**
 * Nada de ~/.claude se sobreescribe sin copia previa.
 * Devuelve la ruta del respaldo, o null si el archivo no existía.
 */
export async function backup(file: string, at = stamp()): Promise<string | null> {
  if (!(await exists(file))) return null;
  const dir = path.join(p.backupsDir(), at);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, path.basename(file));
  await fs.copyFile(file, dest);
  return dest;
}

/** Lista de subdirectorios (sigue symlinks: `video-use` es uno). */
export async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory()) out.push(e.name);
      else if (e.isSymbolicLink()) {
        const st = await fs.stat(path.join(dir, e.name)).catch(() => null);
        if (st?.isDirectory()) out.push(e.name);
      }
    }
    return out.sort();
  } catch {
    return [];
  }
}

export async function listFiles(dir: string, ext: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => !e.isDirectory() && e.name.endsWith(ext))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/** SKILL.md / skill.md: en macOS da igual, en Linux no. */
export async function findSkillFile(dir: string): Promise<string | null> {
  for (const name of ["SKILL.md", "skill.md"]) {
    const f = path.join(dir, name);
    if (await exists(f)) return f;
  }
  return null;
}
