---
name: sdf-character
description: Build an animated 3D character or mascot for a web page as a raymarched signed distance field in one WGSL pass on vgpu (WebGPU) — no mesh, no Blender, no three.js — with spring-driven motion and an adversarial judge loop. Ships a working walker template and a headless render harness. Use when the user says "bring our mascot to life in 3D", "animate this character on the page", "make a 3D walking character with WebGPU", "improve how the character moves", or dale vida a la mascota en 3D / anima este personaje en la web / haz un personaje 3D que camine / mejora cómo se mueve el personaje.
---

# SDF character on vgpu

A method for putting a character on a web page as a signed distance field
raymarched in a single WGSL fragment pass, animated by a pure spring
simulation, and improved by independent judges rather than by eye.

It was distilled from a production mascot: shape fidelity reached 84.7/100
against the character's turnaround sheet and motion went from 38 to 86/100
under an adversarial judge. The last points were rig limits (no knees, no
cloth simulation), not tuning — know that ceiling before promising more.

For vgpu API details, use the project's installed docs (`pnpm exec vgpu docs
cat getting-started.md`) or the `vgpu` skill (`npx skills add vercel-labs/vgpu`).
This skill is the method, not the API.

## Templates

`templates/` holds a complete, working walker (a bean-shaped character with
arms, legs and shoes) that already follows every rule below. Copy all five
files, rename them for the character, then replace the parts.

| File | Role |
|---|---|
| `character-shader.ts` | the whole character — SDF, pose, materials, lighting, camera — as one WGSL string |
| `character-motion.ts` | pure simulation: `step(state, dt, width)` → shader params. No DOM, no GPU |
| `character-motion.check.mjs` | runnable assertions on the simulation: `node character-motion.check.mjs` |
| `CharacterStage.tsx` | the thin React client: vgpu init, surface, loop, visibility, a11y toggle |
| `render-harness.mjs` | headless renders + motion curves for the judges |

The walker is verified: it type-checks under `strict`, the check passes, and
the harness renders a turnaround and a gait cycle on vgpu 0.5.

## Before starting

Ask for what is missing — do not invent a character:

1. **A turnaround**: front, back, both profiles, three-quarters. Two views
   (front and profile) is the minimum; without one, proportions are guesses
   and the fidelity judge has nothing to score against.
2. **Where it lives**: canvas size in px, and the stage it moves across.
3. **What it does**: walk, idle, wave, look at the cursor.
4. **A character bible**, if the brand has one. It overrides your taste.

## Phase 1 — Shape

- **Fix the units** in the shader's header comment and never break them: 1.0
  tall from soles to top of head, feet on `y = 0`, facing `+z` at yaw 0, `+x`
  is the viewer's right.
- **Measure every proportion from the turnaround** and note the view it came
  from beside the constant.
- **One `Params` uniform struct**, mirrored field for field by a TS type.
  Pack related scalars into a `vec4f` and comment each component.
- **`scene(p) -> vec2f`**: `.x` distance, `.y` material id. Combine with
  `pick`, blend with `smin`.
- **Derive the pose once per pixel** into `var<private>` globals at the top of
  `fs_main` (joint positions, rotation matrices), never inside `scene()`,
  which runs hundreds of times per pixel.
- **Local frames per part** (`bodyQ`, head, arm, leg): move the point into the
  part's space, build the part there.
- **Clothing is built from the body, never beside it.** A jacket is an offset
  shell of the torso field; a sleeve is the arm capsule itself. Then no pose
  can push skin through cloth. This is the most important shape rule.
- **Bound expensive parts**: test a cheap sphere first, and evaluate a
  detailed head only when the ray is near it.
- **Clip the march** to the character's bounding box; slow the step near
  surfaces; scale the hit threshold with `t`.
- **Shading**: tetrahedral normals; soft shadows with *short capped steps*
  (long steps skip thin shells and draw contour bands); 5-tap AO; colours
  authored in sRGB and converted; ACES-style tonemap.
- **Transparent background** with only a contact shadow, faded before the
  canvas edge so no border shows.
- Surface detail (fur, fabric weave, spots) is procedural noise or a tiny
  noise texture, never geometry.

## Phase 2 — Motion

- **Pure simulation**: `create()` returns state and a `params` object;
  `step(m, dt, width)` advances it. Node can run it, so it can be checked.
- **Speed comes from the leg geometry.** The stance foot sits under a lever of
  length `LEG` swinging ±`SWING`, so one cycle carries the body
  `4·LEG·sin(SWING)`. Ground speed must equal stride × cadence, or the feet
  skate. Shader and sim share the same `legAngle()` and constants, and the
  check asserts they agree.
- **Every joint is a damped spring**, and each distal joint is pushed by the
  acceleration of the joint above it. Follow-through, drag and settling come
  for free instead of replaying a curve. Stiffness drops down the chain.
- **Pre-compensate periodic targets.** A spring driven at frequency ω lags and
  scales. Divide the target amplitude by the joint's gain and advance its
  phase by the lag (`response(joint, omega)` in the template). Without this,
  a shoulder near resonance lagged 124° in the original.
- **Never step a spring's goal.** Ease the goal first (~80 ms), then spring
  toward it. A stepped goal is a jerk spike in everything downstream.
- **Plant the stance foot through turns**: pivot the body around the ankle
  computed from the same leg angle, and blend the pivot between feet over
  double support.
- **Secondary motion** (ears, hem, tassel, breath, blink) is springs driven by
  body acceleration. It is cheap, and it sells the life.
- **Soft joint limits** (linear, then `tanh` into the stop), and floors
  measured by probe, not by eye.

## Phase 3 — Client

`CharacterStage.tsx` already does this; keep it when adapting:

- `"use client"` only here. `init()` → `effect()` → `surface()` → `frameLoop()`.
- **No WebGPU, no stage**: render nothing rather than a broken canvas.
- The loop runs only while an `IntersectionObserver` sees the stage and the
  user has not paused it; `dt` is capped at 0.1 s.
- **One-shot quality drop**: if the first 120 frames average under 40 fps,
  recreate the surface at 1× DPR.
- **Accessibility (WCAG 2.2.2)**: canvas `aria-hidden`; a pause button at
  least 44 px tall on an opaque background, shown only once WebGPU is up,
  whose **label alone** carries the state (no `aria-pressed` contradicting
  it); `prefers-reduced-motion` starts it still, drawn once. Translate the
  button label to the page's language.
- The cursor is the key light, and it still relights one frame while paused.

## Phase 4 — Judges

You will like what you made. Self-assessment is worthless here, so use
independent judges:

1. **Harness**: in a scratch directory, `pnpm add vgpu pngjs`, `pnpm exec
   vgpu doctor` (must say healthy), then `node render-harness.mjs out`. It
   writes a turnaround at eight yaws, eight frames of one gait cycle, and the
   joint curves as CSV. Add a **probe** when parts can collide: sample the
   SDF over the pose range to measure clearances (hand to torso, sleeve to
   jacket).
2. **Fidelity judge**: a fresh subagent gets the renders and the turnaround,
   scores each view 0–100, and lists its top five differences with numbers
   ("ears 15% too long in profile"). Fix the worst one, then re-render.
3. **Motion judge**, adversarial: a fresh subagent is told to find what reads
   robotic or wrong against real gait references, using the frames and the
   curves. Fix its top finding, then re-judge. Stop when it says what remains
   is a rig limit.
4. Commit each accepted fix with its measured before and after (jerk, px/s of
   foot slide, clearance), and add an assertion to the check for anything
   that regressed once.

## Mistakes that cost time

- Soft-shadow steps that are too long skip thin shells → contour bands.
- A human-sized elbow bend on a cartoon's short forearm lifts a big hand
  level. Keep elbows soft and let the hand hang.
- A wrist steered *against* the swing reads as a puppet's paw; it should only
  *trail* the forearm.
- The sleeve binds before the hand does. Probe the sleeve.
- Some embedded browsers throttle `requestAnimationFrame` without focus.
  Measure fps in a focused window.
- Keep vgpu's Node adapter out of the app's install: the browser never uses
  it, so the harness installs its own copy.

## Kick-off prompt

> Build `<Name>` as an SDF character on vgpu following the `sdf-character`
> skill. Turnaround: `<path>`. Stage: `<where, W×H px>`. Behaviour: `<walk /
> idle / wave / look at cursor>`. Done means: fidelity judge ≥ 80, motion
> judge ≥ 80, the motion check green, and an accessibility pass on the
> toggle. Commit each accepted judge fix with its measured before and after.
