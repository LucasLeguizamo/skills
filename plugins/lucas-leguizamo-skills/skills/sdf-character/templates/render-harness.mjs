// Headless judge harness: renders the character with vgpu in Node and writes
// PNGs for the judges, plus a CSV of the motion curves.
//
//   pnpm add vgpu pngjs           (in a scratch dir, not the app)
//   pnpm exec vgpu doctor         (must say healthy)
//   node render-harness.mjs [outDir]
//
// Writes: turn-<deg>.png (turnaround at the reference's angles, standing),
// gait-<i>.png (one gait cycle, 8 frames, three-quarter view) and curves.csv.
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { effect, init, target } from "vgpu/node";
import { CHARACTER_WGSL } from "./character-shader.ts";
import { CANVAS_H, CANVAS_W, createCharacterMotion, stepCharacterMotion } from "./character-motion.ts";

const out = process.argv[2] ?? "harness-out";
mkdirSync(out, { recursive: true });
const SCALE = 3; // judges need detail: render 3x the canvas
const size = [CANVAS_W * SCALE, CANVAS_H * SCALE];

const gpu = await init();
const rt = target(gpu, { size });
const m = createCharacterMotion();
const fx = effect(gpu, CHARACTER_WGSL, { set: { params: { ...m.params, res: size } } });

async function shot(name, params) {
  fx.set({ params: { ...params, res: size } });
  fx.draw(rt);
  const pixels = await rt.color.read({ mipLevel: 0, region: "all" });
  const png = new PNG({ width: size[0], height: size[1] });
  // composite on white so transparent pixels read as background
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3] / 255;
    for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(pixels[i + c] + 255 * (1 - a));
    png.data[i + 3] = 255;
  }
  writeFileSync(`${out}/${name}.png`, PNG.sync.write(png));
}

// turnaround: match the angles of the reference sheet
for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
  await shot(`turn-${deg}`, { ...m.params, gait: 0, yaw: (deg * Math.PI) / 180 });
}

// one gait cycle once the walk is up to speed, plus the curves the motion judge reads
const rows = ["t,phase,gait,x,armL_swing,armR_swing,armL_elbow"];
for (let i = 0; i < 60 * 12; i++) {
  stepCharacterMotion(m, 1 / 60, 1000);
  rows.push([i / 60, m.phase, m.gait, m.x, m.armL.swing.x, m.armR.swing.x, m.armL.elbow.x].map((v) => v.toFixed(4)).join(","));
}
const start = m.phase;
let frame = 0;
while (frame < 8) {
  stepCharacterMotion(m, 1 / 240, 1000);
  if (m.phase - start >= (frame * 2 * Math.PI) / 8) await shot(`gait-${frame++}`, m.params);
}
writeFileSync(`${out}/curves.csv`, rows.join("\n"));
gpu.dispose();
console.log(`wrote ${out}/`);
