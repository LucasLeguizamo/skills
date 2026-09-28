// Runnable check for the motion sim: node character-motion.check.mjs (Node ≥ 22.18 strips the .ts types).
// Add an assertion for every bug that shipped once.
import assert from "node:assert/strict";
import * as motion from "./character-motion.ts";
import * as shader from "./character-shader.ts";

const { createCharacterMotion, stepCharacterMotion } = motion;
assert.equal(motion.LEG, shader.LEG, "shader and sim share the leg length");
assert.equal(motion.SWING, shader.SWING, "shader and sim share the leg swing");

const width = 1000;
const m = createCharacterMotion();
const modes = [];
let corr = 0;
for (let t = 0; t < 40; t += 1 / 60) {
  stepCharacterMotion(m, 1 / 60, width);
  if (m.mode === "walk" && m.gait > 0.9) corr += m.armL.swing.x * m.armR.swing.x;
  if (modes.at(-1) !== m.mode) modes.push(m.mode);
  for (const v of Object.values(m.params).flat()) assert.ok(Number.isFinite(v), "params stay finite");
  assert.ok(m.x > 0 && m.x < width, `x ${m.x} stays on the stage`);
}
assert.deepEqual(modes.slice(0, 4), ["walk", "idle", "turn", "walk"], "walks, stops, turns, walks back");
assert.ok(corr < 0, "walking, the arms swing opposite each other");
console.log("character-motion ok:", modes.join(" → "));
