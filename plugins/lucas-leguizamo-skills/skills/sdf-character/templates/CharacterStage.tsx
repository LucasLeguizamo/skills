"use client";

// The thin client: vgpu init, surface, frame loop, visibility and the a11y toggle.
// All motion lives in character-motion.ts; all drawing in character-shader.ts.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { effect, frame, frameLoop, init, surface } from "vgpu";
import type { FrameLoopHandle } from "vgpu";
import { CHARACTER_WGSL } from "./character-shader";
import { CANVAS_H, CANVAS_W, createCharacterMotion, relight, stepCharacterMotion } from "./character-motion";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useCharacter(
  stageRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  playing: boolean,
) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const playingRef = useRef(playing);
  const controlRef = useRef<{ play: () => void; pause: () => void } | null>(null);

  useEffect(() => {
    playingRef.current = playing;
    if (playing) controlRef.current?.play();
    else controlRef.current?.pause();
  }, [playing]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let disposed = false;
    let gpu: Awaited<ReturnType<typeof init>> | undefined;
    let fx: ReturnType<typeof effect> | undefined;
    let canvasSurface: ReturnType<typeof surface> | undefined;
    let loop: FrameLoopHandle | undefined;
    let visible = false;
    let pointer: { x: number; y: number } | null = null;
    const motion = createCharacterMotion();
    const params = motion.params;

    const look = () => {
      if (!pointer) return null;
      const r = canvas.getBoundingClientRect();
      return { dx: pointer.x - (r.left + r.width / 2), dy: r.top + r.height * 0.35 - pointer.y };
    };
    const drawOnce = () => {
      if (!gpu || !fx || !canvasSurface) return;
      relight(motion, look());
      fx.set({ params: { light: params.light } });
      frame(gpu, (f) => f.pass(canvasSurface!, fx!));
    };
    const attachSurface = (maxDpr: number) => {
      canvasSurface?.dispose();
      canvasSurface = surface(gpu!, canvas, { dpr: [1, maxDpr], clearColor: [0, 0, 0, 0] } as Parameters<typeof surface>[2]);
      canvasSurface.onResize(({ width, height }) => {
        params.res = [width, height];
        fx!.set({ params: { res: params.res } });
      });
    };

    // one-shot quality drop: if the first ~2 s average under 40 fps, render at 1x DPR
    let frames = 0;
    let slowTime = 0;
    let lastT = performance.now();
    const tick = (dt: number) => {
      stepCharacterMotion(motion, dt, stage.clientWidth);
      relight(motion, look());
      stage.style.setProperty("--character-x", `${motion.x - CANVAS_W / 2}px`);
    };
    const start = () => {
      if (loop || !gpu || !fx || !canvasSurface || !visible || !playingRef.current) return;
      lastT = performance.now();
      loop = frameLoop(gpu, (f) => {
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastT) / 1000);
        lastT = now;
        if (frames < 120) {
          frames++;
          slowTime += dt;
          if (frames === 120 && slowTime / frames > 1 / 40) attachSurface(1);
        }
        tick(dt);
        fx!.set({ params });
        f.pass(canvasSurface!, fx!);
      });
    };
    const stop = () => {
      loop?.stop();
      loop = undefined;
    };
    controlRef.current = { play: start, pause: () => { stop(); drawOnce(); } };

    const onPointer = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!loop && visible) drawOnce(); // paused: relight only
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });

    (async () => {
      try {
        gpu = await init();
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return gpu.dispose();
      fx = effect(gpu, CHARACTER_WGSL, { label: "character", set: { params } });
      attachSurface(2);
      tick(0);
      fx.set({ params });
      io.observe(stage);
      drawOnce();
      setReady(true);
    })();

    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      stop();
      controlRef.current = null;
      gpu?.dispose();
    };
  }, [stageRef, canvasRef]);

  return { ready, failed };
}

/**
 * Position the canvas with CSS: `transform: translateX(var(--character-x))` on
 * the canvas inside a `position: relative` stage.
 */
export default function CharacterStage({ name }: { name: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduceMotion;
  const { ready, failed } = useCharacter(stageRef, canvasRef, playing);

  // no WebGPU: no stage at all
  if (failed) return null;

  return (
    <div className="character-stage" ref={stageRef}>
      <canvas ref={canvasRef} className="character-canvas" width={CANVAS_W} height={CANVAS_H} aria-hidden="true" />
      {/* the label alone carries the state; aria-pressed would contradict it. Keep it >= 44px, opaque */}
      {ready && (
        <button type="button" className="character-toggle" onClick={() => setChoice(!playing)}>
          {playing ? `Pause ${name}` : `Animate ${name}`}
        </button>
      )}
    </div>
  );
}
