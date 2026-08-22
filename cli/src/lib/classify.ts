import type { Tag } from "./manifest.js";

/**
 * Semilla de clasificación: el veredicto humano de AUDIT.md (2026-08-21).
 * Lo que no está acá se deduce del lockfile de skills.sh
 * (`~/.agents/.skill-lock.json`): si una skill vino de un repo de terceros es
 * `vendor`; si no hay evidencia de ninguna de las dos fuentes, es `unknown` y
 * lo resuelve una persona editando el manifest a mano (init respeta la edición).
 */
export interface Seed {
  tag: Tag;
  note?: string;
}

export const SEED: Record<string, Seed> = {
  // Skills de autoría propia — AUDIT.md
  "skill:concat-content": { tag: "mine", note: "Migrada a lucas-core; sin uso en la ventana de 30 días" },
  "skill:pm-agent": { tag: "mine", note: "Migrada a lucas-core" },
  "skill:whiteboard": { tag: "mine", note: "Migrada a lucas-core" },
  // Skills de terceros con matices — AUDIT.md
  "skill:freeticket-cli": {
    tag: "vendor",
    note: "Org AppFreeticket; fuente canónica AppFreeticket/agent-skills, se instala como plugin freeticket@freeticket. No republicar",
  },
  "skill:video-use": { tag: "vendor", note: "Symlink a ~/Developer/video-use; MIT © Browser Use" },
  // Agentes de autoría propia, pero atados a un repo — AUDIT.md
  "agent:ft-software-architect": { tag: "mine", note: "Específico de free-admin; no va a lucas-core" },
  "agent:ft-testing-expert": { tag: "mine", note: "Específico de free-admin; no va a lucas-core" },
  "agent:ft-qa-reviewer": { tag: "mine", note: "Específico de free-admin; no va a lucas-core" },
  "agent:ft-devops-ci": { tag: "mine", note: "Específico de free-admin; no va a lucas-core" },
};

/** Los 12 clones de Leonxlnx/taste-skill: vendor y candidatos a borrar. */
export const DEAD_CANDIDATES = new Set([
  "brandkit",
  "design-taste-frontend",
  "full-output-enforcement",
  "gpt-taste",
  "high-end-visual-design",
  "image-to-code",
  "imagegen-frontend-mobile",
  "imagegen-frontend-web",
  "industrial-brutalist-ui",
  "minimalist-ui",
  "redesign-existing-projects",
  "stitch-design-taste",
  "to-prd",
  "insforge-debug",
  "insforge-integrations",
  "video-use",
]);

export function seedFor(kind: "skill" | "agent", name: string): Seed | undefined {
  return SEED[`${kind}:${name}`];
}

/** El marketplace propio: todo lo que salga de acá es `mine` por definición. */
export const OWN_MARKETPLACE = "lucas";
