// The character's motion as a pure simulation: state in, shader params out.
// No DOM, no GPU — the client feeds it the stage width and draws; Node can run it.

export const CANVAS_W = 170;
export const CANVAS_H = 196;
const VIEW_HEIGHT = 1.32; // world units visible vertically: the shader's 0.66 half-height
export const PX_PER_UNIT = CANVAS_H / VIEW_HEIGHT;

// Leg geometry, mirrored in character-shader.ts (the check asserts they agree).
export const LEG = 0.16; // hip to ankle
export const SWING = 0.32; // max leg angle, rad

// The planted foot sits under a LEG lever swinging ±SWING, so one cycle carries
// the body 4·LEG·sin(SWING). Ground speed must equal stride × cadence or the feet skate.
const STRIDE = 4 * LEG * Math.sin(SWING);
const CADENCE = 1.6; // gait cycles per second
const SPEED = STRIDE * CADENCE * PX_PER_UNIT; // px/s
export const WALK_YAW = 1.05; // three-quarter view while walking
const IDLE_SECONDS = 2;

type Vec2 = [number, number];
type Vec4 = [number, number, number, number];
export type CharacterParams = {
  res: Vec2; time: number; phase: number; gait: number; yaw: number;
  armL: Vec4; armR: Vec4; light: Vec4; cam: Vec4;
};

type Spring = { x: number; v: number };
const spring = (x = 0): Spring => ({ x, v: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const approach = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

/** Damped spring toward `target` with an extra force `f`; returns the acceleration. */
function drive(s: Spring, target: number, k: number, zeta: number, dt: number, f = 0) {
  const a = (target - s.x) * k - s.v * 2 * zeta * Math.sqrt(k) + f;
  s.v += a * dt;
  s.x += s.v * dt;
  return a;
}

// A joint is a real damped pendulum, so it swings on after a stop. To make it
// land on a periodic target at the phase and size we mean, the target is
// pre-shifted by the joint's steady-state lag and divided by its gain.
type Joint = { k: number; z: number };
function response(j: Joint, omega: number) {
  const r = omega / Math.sqrt(j.k);
  return { gain: 1 / Math.hypot(1 - r * r, 2 * j.z * r), lag: Math.atan2(2 * j.z * r, 1 - r * r) };
}
const J = { swing: { k: 70, z: 0.3 }, abd: { k: 60, z: 0.5 }, elbow: { k: 220, z: 0.4 } };
const GAIT_W = 2 * Math.PI * CADENCE;
const PC = response(J.swing, GAIT_W);
const REST = { swing: 0.05, abd: 0.18, elbow: 0.25 };
const ARM_SWING = 0.35;

type Arm = { swing: Spring; abd: Spring; elbow: Spring };
const createArm = (): Arm => ({ swing: spring(REST.swing), abd: spring(REST.abd), elbow: spring(REST.elbow) });

/** side +1 = left. Each arm swings with the opposite leg; the elbow is dragged by the shoulder. */
function stepArm(a: Arm, side: 1 | -1, phase: number, gait: number, dt: number) {
  // left leg is forward at sin(phase) = 1, so the left arm is back then
  const target = REST.swing - side * (ARM_SWING / PC.gain) * Math.sin(phase + PC.lag) * gait;
  const acc = drive(a.swing, target, J.swing.k, J.swing.z, dt);
  drive(a.abd, REST.abd + 0.03 * gait, J.abd.k, J.abd.z, dt);
  // the forearm lags: pushed by the shoulder's acceleration, never replaying a curve
  drive(a.elbow, REST.elbow + 0.15 * gait, J.elbow.k, J.elbow.z, dt, -0.4 * acc);
  a.elbow.x = clamp(a.elbow.x, 0, 1.4);
}

export function createCharacterMotion() {
  const params: CharacterParams = {
    res: [CANVAS_W, CANVAS_H], time: 0, phase: 0, gait: 0, yaw: WALK_YAW,
    armL: [REST.swing, REST.abd, REST.elbow, 0], armR: [REST.swing, REST.abd, REST.elbow, 0],
    light: [0.4, 0.7, 0.6, 1.4], cam: [0, 0.12, 3.2, 1],
  };
  return {
    params,
    mode: "walk" as "walk" | "turn" | "idle",
    x: CANVAS_W, dir: 1 as 1 | -1, modeT: 0,
    time: 0, phase: 0, gait: 0, gaitGoal: 1,
    gaitS: spring(), yawS: spring(WALK_YAW),
    armL: createArm(), armR: createArm(),
  };
}
export type CharacterMotion = ReturnType<typeof createCharacterMotion>;

/** Pointer relative to the character's chest (+y up) becomes the key light. */
export function relight(m: CharacterMotion, look: { dx: number; dy: number } | null) {
  if (!look) return;
  const dy = Math.max(-80, look.dy);
  const len = Math.hypot(look.dx, dy, 420);
  m.params.light = [look.dx / len, dy / len, 420 / len, m.params.light[3]];
}

/** Advance by dt seconds on a stage `width` px wide. */
export function stepCharacterMotion(m: CharacterMotion, dt: number, width: number) {
  m.time += dt;
  m.modeT += dt;
  const minX = CANVAS_W * 0.45;
  const maxX = width - CANVAS_W * 0.45;

  if (m.mode === "walk" && (m.dir > 0 ? m.x >= maxX : m.x <= minX)) {
    m.mode = "idle";
    m.modeT = 0;
  } else if (m.mode === "idle" && m.modeT > IDLE_SECONDS) {
    m.mode = "turn";
    m.modeT = 0;
    m.dir = m.dir > 0 ? -1 : 1;
  } else if (m.mode === "turn" && Math.abs(m.yawS.x - m.dir * WALK_YAW) < 0.05) {
    m.mode = "walk";
    m.modeT = 0;
  }

  // never step a spring's goal: ease the goal (~80 ms), then spring toward it
  m.gaitGoal = approach(m.gaitGoal, m.mode === "walk" ? 1 : 0, 12, dt);
  drive(m.gaitS, m.gaitGoal, 40, 1, dt);
  m.gait = clamp(m.gaitS.x, 0, 1);

  // the phase only advances with the gait, and the body only moves with the phase: no skating
  m.phase += GAIT_W * m.gait * dt;
  m.x = clamp(m.x + m.dir * SPEED * m.gait * dt, minX, maxX);

  drive(m.yawS, m.dir * WALK_YAW, 30, 0.9, dt);
  stepArm(m.armL, 1, m.phase, m.gait, dt);
  stepArm(m.armR, -1, m.phase, m.gait, dt);

  const p = m.params;
  p.time = m.time;
  p.phase = m.phase;
  p.gait = m.gait;
  p.yaw = m.yawS.x;
  p.armL = [m.armL.swing.x, m.armL.abd.x, m.armL.elbow.x, 0];
  p.armR = [m.armR.swing.x, m.armR.abd.x, m.armR.elbow.x, 0];
}
