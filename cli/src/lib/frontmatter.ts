/**
 * Parser del subconjunto de YAML que usa el frontmatter de Claude Code:
 * claves escalares de primer nivel y bloques `>` / `|`. Nada más.
 * Si algún día el formato crece, esto falla en silencio (devuelve lo que
 * entendió) en vez de romper el comando.
 */
export type Frontmatter = Record<string, string>;

export interface Parsed {
  data: Frontmatter;
  body: string;
}

export function parseFrontmatter(source: string): Parsed {
  const text = source.replace(/^﻿/, "");
  if (!text.startsWith("---")) return { data: {}, body: text };
  const lines = text.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i] ?? "").trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, body: text };

  const data: Frontmatter = {};
  let i = 1;
  while (i < end) {
    const raw = lines[i] ?? "";
    i++;
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const m = /^([A-Za-z0-9_-]+):\s?(.*)$/.exec(raw);
    if (!m) continue;
    const key = m[1] as string;
    const inline = (m[2] ?? "").trim();
    if (inline === ">" || inline === "|" || inline === ">-" || inline === "|-") {
      const block: string[] = [];
      while (i < end) {
        const next = lines[i] ?? "";
        if (next.trim() && !/^\s/.test(next)) break;
        block.push(next.replace(/^ {2}/, ""));
        i++;
      }
      data[key] = block.join("\n").trim();
    } else {
      data[key] = unquote(inline);
    }
  }
  return { data, body: lines.slice(end + 1).join("\n").replace(/^\n+/, "") };
}

function unquote(v: string): string {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    // Escalar YAML entre comillas dobles: hay frontmatter real que mete
    // \n literales adentro (los agentes con <example> en una sola línea).
    return v
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

/** Quita los bloques <example> de una descripción de agente. */
export function stripExamples(description: string): string {
  return description.replace(/<example>[\s\S]*?<\/example>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parte una descripción en "qué hace" + "cuándo dispararla".
 * El estándar propio escribe el disparador con "Úsala/Úsalo/Invócalo cuando…"
 * (o "Use when…" en inglés); si no aparece, whenToUse queda vacío y `doctor`
 * lo marcará cuando exista.
 */
const TRIGGER = /(Úsal[ao]\b|Úses[ea]\b|Invócal[ao]\b|Use (?:this|it) when\b|Use when\b|This skill should be used\b|Trigger(?:s)? when\b)/i;

export function splitDescription(description: string): { summary: string; whenToUse: string } {
  const clean = stripExamples(description);
  const m = TRIGGER.exec(clean);
  if (!m || m.index === 0) {
    return { summary: firstSentence(clean), whenToUse: m ? clean.slice(m.index).trim() : "" };
  }
  return {
    summary: firstSentence(clean.slice(0, m.index)),
    whenToUse: clean.slice(m.index).trim(),
  };
}

/** Una línea: hasta el primer punto seguido de espacio, o hasta un guion largo. */
export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
  const cut = /\.\s+[A-ZÁÉÍÓÚÑ¿¡]/.exec(t);
  return (cut ? t.slice(0, cut.index) : t).trim();
}
