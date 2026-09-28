// A character as a signed distance field, raymarched in one WGSL fragment pass.
//
// Template: a bean-shaped walker (body, head, eyes, arms, legs, shoes) that
// shows every rule of the method. Replace the parts, keep the structure.
//
// Units: the character is 1.0 tall from the soles to the top of the head, feet
// on y = 0, facing +z at yaw 0, +x is the viewer's right. Measure every
// proportion from the turnaround and say which view it came from.
//
// Clothing (none here) is built from the body, never beside it: a jacket is an
// offset shell of the torso field, a sleeve is the arm capsule itself, so no
// pose can push skin through cloth.

// Leg geometry, mirrored in character-motion.ts: the stride comes from these.
export const LEG = 0.16; // hip to ankle
export const SWING = 0.32; // max leg angle, rad

export const CHARACTER_WGSL = /* wgsl */ `
struct Params {
  res: vec2f,
  time: f32,
  phase: f32,
  gait: f32,
  yaw: f32,
  // per arm: shoulder swing (+ forward), abduction (+ outward), elbow flex, unused
  armL: vec4f,
  armR: vec4f,
  // xyz direction to the key light, w intensity
  light: vec4f,
  // camera: yaw, pitch, distance, zoom
  cam: vec4f,
}
@group(0) @binding(0) var<uniform> params: Params;

const M_BODY = 1.0;
const M_EYE = 2.0;
const M_SHOE = 3.0;

const LEG = ${LEG};
const SWING = ${SWING};
const HEAD_C = vec3f(0.0, 0.78, 0.0);
const BODY_C = vec3f(0.0, 0.42, 0.0);
const HIP = vec3f(0.075, 0.2, 0.0);
const SHOULDER = vec3f(0.17, 0.5, 0.0);
const UPPER = 0.12;
const FORE = 0.11;

// Pose, derived once per pixel from params (never inside scene()).
var<private> gYaw: mat2x2f;
var<private> gBob: f32;
var<private> gAnkle: array<vec3f, 2>;
var<private> gElbow: array<vec3f, 2>;
var<private> gHand: array<vec3f, 2>;

// Leg swing that keeps the planted foot still: during stance the ankle's
// horizontal offset LEG·sin(angle) moves linearly, like the body.
fn legAngle(ph: f32) -> f32 {
  let u = fract((ph - 1.5708) / 6.28318);
  let s = select(-1.0 + 2.0 * smoothstep(0.0, 1.0, (u - 0.5) * 2.0), 1.0 - 4.0 * u, u < 0.5);
  return asin(sin(SWING) * s);
}

fn rot(a: f32) -> mat2x2f {
  let c = cos(a);
  let s = sin(a);
  return mat2x2f(c, s, -s, c);
}
fn smin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
fn sdEll(p: vec3f, r: vec3f) -> f32 {
  let k0 = length(p / r);
  let k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-5);
}
fn sdCap(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
fn sdRoundBox(p: vec3f, b: vec3f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
fn hash13(p: vec3f) -> f32 {
  var q = fract(p * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}
fn pick(a: vec2f, d: f32, m: f32) -> vec2f {
  return select(a, vec2f(d, m), d < a.x);
}

// World -> body space: undo the walk's bob and the yaw.
fn bodyQ(p: vec3f) -> vec3f {
  var q = p - vec3f(0.0, gBob, 0.0);
  let xz = gYaw * q.xz;
  return vec3f(xz.x, q.y, xz.y);
}

// Forward kinematics for a limb hanging along -y: swing about x, spread about z.
fn limbDir(s: f32, swing: f32, abd: f32) -> vec3f {
  return normalize(vec3f(s * sin(abd), -cos(abd) * cos(swing), cos(abd) * sin(swing)));
}

fn scene(p: vec3f) -> vec2f {
  let q = bodyQ(p);
  // body and head are one blended surface
  var d = smin(sdEll(q - BODY_C, vec3f(0.2, 0.25, 0.17)), length(q - HEAD_C) - 0.2, 0.08);
  var res = vec2f(1e5, 0.0);
  for (var i = 0; i < 2; i++) {
    let s = select(-1.0, 1.0, i == 0);
    let sh = SHOULDER * vec3f(s, 1.0, 1.0);
    d = smin(d, sdCap(q, sh, gElbow[i], 0.04), 0.03);
    d = min(d, sdCap(q, gElbow[i], gHand[i], 0.036));
    d = min(d, length(q - gHand[i]) - 0.045);
    let hip = HIP * vec3f(s, 1.0, 1.0);
    d = smin(d, sdCap(q, hip, gAnkle[i], 0.045), 0.02);
    let shoe = sdRoundBox(q - gAnkle[i] - vec3f(0.0, -0.01, 0.03), vec3f(0.05, 0.03, 0.08), 0.03);
    res = pick(res, shoe, M_SHOE);
  }
  res = pick(res, d, M_BODY);
  let eye = min(length(q - vec3f(0.07, 0.8, 0.18)), length(q - vec3f(-0.07, 0.8, 0.18))) - 0.035;
  return pick(res, eye, M_EYE);
}

fn dist(p: vec3f) -> f32 { return scene(p).x; }

fn calcNormal(p: vec3f) -> vec3f {
  let e = vec2f(0.0008, -0.0008);
  return normalize(
    e.xyy * dist(p + e.xyy) + e.yyx * dist(p + e.yyx) +
    e.yxy * dist(p + e.yxy) + e.xxx * dist(p + e.xxx));
}

fn softShadow(ro: vec3f, rd: vec3f) -> f32 {
  var res = 1.0;
  // short capped steps: long ones skip thin shells and trace contour bands
  var t = 0.012 + 0.02 * hash13(ro * 1000.0);
  for (var i = 0; i < 96; i++) {
    let h = dist(ro + rd * t);
    res = min(res, 2.5 * h / t);
    t += clamp(h * 0.8, 0.003, 0.03);
    if (res < 0.002 || t > 1.6) { break; }
  }
  return clamp(res, 0.0, 1.0);
}

fn ambientOcclusion(p: vec3f, n: vec3f) -> f32 {
  var occ = 0.0;
  var w = 1.0;
  for (var i = 1; i <= 5; i++) {
    let h = 0.012 * f32(i) + 0.004 * f32(i * i);
    occ += (h - dist(p + n * h)) * w;
    w *= 0.7;
  }
  return clamp(1.0 - occ, 0.0, 1.0);
}

fn srgbToLinear(c: vec3f) -> vec3f { return pow(c, vec3f(2.2)); }

fn albedo(m: f32) -> vec3f {
  // authored in sRGB: replace with the character's palette
  if (m == M_EYE) { return srgbToLinear(vec3f(0.08, 0.07, 0.1)); }
  if (m == M_SHOE) { return srgbToLinear(vec3f(0.2, 0.22, 0.4)); }
  return srgbToLinear(vec3f(0.98, 0.7, 0.3));
}

fn shade(p: vec3f, rd: vec3f, m: f32) -> vec3f {
  let n = calcNormal(p);
  let l = normalize(params.light.xyz);
  // shadows keep 30% of the key so the character never goes black
  let sh = mix(0.3, 1.0, softShadow(p + n * 0.006, l));
  let ao = ambientOcclusion(p, n);
  let key = params.light.w * max(dot(n, l) * 0.6 + 0.4, 0.0) * sh;
  let ambient = mix(vec3f(0.4, 0.38, 0.44), vec3f(0.7, 0.75, 0.9), n.y * 0.5 + 0.5) * 0.5 * ao;
  let h = normalize(l - rd);
  let spec = pow(max(dot(n, h), 0.0), select(24.0, 120.0, m == M_EYE)) * select(0.15, 0.8, m == M_EYE) * sh;
  let rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.25 * ao;
  return albedo(m) * (key + ambient + rim) + spec;
}

fn tonemap(x: vec3f) -> vec3f {
  let c = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  return pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  gYaw = rot(params.yaw);
  let ang = vec2f(legAngle(params.phase), legAngle(params.phase + 3.14159)) * params.gait;
  // the stance leg is a lever: the body drops as it swings
  gBob = -params.gait * LEG * (1.0 - cos(SWING * sin(params.phase)));
  let lift = vec2f(max(0.0, cos(params.phase)), max(0.0, -cos(params.phase))) * 0.04 * params.gait;
  for (var i = 0; i < 2; i++) {
    let s = select(-1.0, 1.0, i == 0);
    let hip = HIP * vec3f(s, 1.0, 1.0);
    gAnkle[i] = hip + LEG * vec3f(0.0, -cos(ang[i]), sin(ang[i])) + vec3f(0.0, lift[i], 0.0);
    let arm = select(params.armR, params.armL, i == 0);
    let sh = SHOULDER * vec3f(s, 1.0, 1.0);
    gElbow[i] = sh + UPPER * limbDir(s, arm.x, arm.y);
    gHand[i] = gElbow[i] + FORE * limbDir(s, arm.x + arm.z, arm.y * 0.7);
  }

  let aspect = params.res.x / params.res.y;
  let ndc = vec2f((uv.x * 2.0 - 1.0) * aspect, 1.0 - uv.y * 2.0);
  let focus = vec3f(0.0, 0.5, 0.0);
  let camDist = params.cam.z;
  let ro = focus + camDist * vec3f(sin(params.cam.x) * cos(params.cam.y), sin(params.cam.y), cos(params.cam.x) * cos(params.cam.y));
  let fw = normalize(focus - ro);
  let rt = normalize(cross(fw, vec3f(0.0, 1.0, 0.0)));
  let up = cross(rt, fw);
  let halfH = 0.66 / params.cam.w;
  let rd = normalize(fw * camDist + (rt * ndc.x + up * ndc.y) * halfH);

  // clip the march to the character's bounds
  let bmin = vec3f(-0.5, -0.02, -0.5);
  let bmax = vec3f(0.5, 1.05, 0.5);
  let inv = 1.0 / rd;
  let t0 = (bmin - ro) * inv;
  let t1 = (bmax - ro) * inv;
  let tn = max(max(min(t0.x, t1.x), min(t0.y, t1.y)), min(t0.z, t1.z));
  let tf = min(min(max(t0.x, t1.x), max(t0.y, t1.y)), max(t0.z, t1.z));

  var t = max(tn, 0.0);
  var hit = -1.0;
  if (tf > t) {
    for (var i = 0; i < 160; i++) {
      let h = scene(ro + rd * t);
      if (h.x < 0.0006 * t) { hit = h.y; break; }
      t += h.x * select(0.95, 0.55, h.x < 0.04);
      if (t > tf) { break; }
    }
  }
  if (hit > 0.0) {
    return vec4f(tonemap(shade(ro + rd * t, rd, hit)), 1.0);
  }

  // transparent background; only the contact shadow on the floor
  if (rd.y < 0.0) {
    let g = ro + rd * (-ro.y / rd.y);
    let sh = softShadow(g + vec3f(0.0, 0.002, 0.0), normalize(params.light.xyz));
    let contact = 1.0 - clamp(dist(g) / 0.12, 0.0, 1.0);
    // fade before the canvas edge so the shadow never shows a border
    let fade = smoothstep(0.5, 0.25, abs(g.x)) * smoothstep(0.6, 0.3, abs(g.z));
    let a = clamp((1.0 - sh) * 0.4 + contact * contact * 0.5, 0.0, 0.7) * fade;
    return vec4f(0.0, 0.0, 0.0, a);
  }
  return vec4f(0.0);
}
`;
