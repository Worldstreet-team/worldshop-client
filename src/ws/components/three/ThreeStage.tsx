"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { judge3D, reportDevice } from "@ws/lib/three/capability";
import { cx } from "@ws/lib/cx";
import type { Scene, SceneFactory } from "./types";
import { SCROLLING_EVENT, isScrolling } from "@ws/components/motion/ScrollState";

/*
 * ThreeStage: a 3D scene that costs nothing until it's worth it.
 * - The fallback (a static image or plain markup) renders on the server and stays for
 *   anyone the capability gate turns away (lib/three/capability.ts), so the page is
 *   whole without WebGL.
 * - three.js and the scene load only when the stage nears the viewport, and the loop
 *   pauses off-screen and in background tabs.
 * - The canvas fades in over the fallback after its first frame; a lost GL context or
 *   a switch to reduced motion puts the fallback back.
 */

type Props = {
  /** Loads the scene module, e.g. `() => import("./scenes/hero").then((m) => m.hero)`. */
  load: () => Promise<SceneFactory>;
  fallback: ReactNode;
  /** Pointer drags feed the scene (and stop page scroll sideways). */
  draggable?: boolean;
  /**
   * Where pointer moves are read: the stage itself, or its parent when content sits on
   * top of the stage (the home hero's slides).
   */
  pointerScope?: "stage" | "parent";
  /** A step the scene follows (the hero turns with the carousel). */
  step?: number;
  className?: string;
};

type Status = "idle" | "live" | "off";

export function ThreeStage({ load, fallback, draggable = false, pointerScope = "stage", step = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load);
  const sceneRef = useRef<Scene | null>(null);
  const stepRef = useRef(step);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    stepRef.current = step;
    sceneRef.current?.step?.(step);
  }, [step]);

  useEffect(() => {
    const el = ref.current!;
    if (!judge3D(reportDevice()).ok) return;

    let disposed = false;
    let scene: Scene | null = null;
    let renderer: import("three").WebGLRenderer | null = null;
    let visible = false;
    let started = false;
    let last = 0;
    const minFrame = 1000 / rules.three.maxFps - 1;
    const cleanups: (() => void)[] = [];

    const loop = (now: number) => {
      if (!scene || now - last < minFrame) return;
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      scene.frame(now / 1000, delta);
    };
    // Off-screen, in a background tab or mid-scroll (the scroll gets the frame budget).
    const run = () => renderer?.setAnimationLoop(visible && !document.hidden && !isScrolling() ? loop : null);

    const stop = () => {
      if (disposed) return;
      disposed = true;
      cleanups.forEach((fn) => fn());
      renderer?.setAnimationLoop(null);
      sceneRef.current = null;
      scene?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };

    const start = async () => {
      started = true;
      const [THREE, factory] = await Promise.all([import("three"), loadRef.current()]);
      if (disposed) return;
      const canvas = document.createElement("canvas");
      canvas.className = "ws-stage__canvas";
      canvas.setAttribute("aria-hidden", "true");
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, rules.three.maxPixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);

      const css = getComputedStyle(el);
      const token = (name: string, or: string) => css.getPropertyValue(name).trim() || or;
      scene = factory({
        THREE,
        renderer,
        width,
        height,
        colors: { ember: token("--cx-ember", "#efbe04"), text: token("--cx-text", "#f5f5f4") },
      });
      scene.step?.(stepRef.current);
      sceneRef.current = scene;
      scene.frame(0, 0);
      el.append(canvas);
      setStatus("live");

      const resize = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        if (w === 0 || h === 0) return;
        renderer?.setSize(w, h, false);
        scene?.resize(w, h);
      });
      resize.observe(el);
      cleanups.push(() => resize.disconnect());

      const onLost = (e: Event) => {
        e.preventDefault();
        stop();
        setStatus("off");
      };
      canvas.addEventListener("webglcontextlost", onLost);
      document.addEventListener("visibilitychange", run);
      cleanups.push(() => document.removeEventListener("visibilitychange", run));
      window.addEventListener(SCROLLING_EVENT, run);
      cleanups.push(() => window.removeEventListener(SCROLLING_EVENT, run));

      const area = pointerScope === "parent" && el.parentElement ? el.parentElement : el;
      const onMove = (e: PointerEvent) => {
        const r = area.getBoundingClientRect();
        scene?.pointer?.(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      };
      area.addEventListener("pointermove", onMove);
      cleanups.push(() => area.removeEventListener("pointermove", onMove));

      if (draggable) {
        let drag: { x: number; y: number } | null = null;
        const down = (e: PointerEvent) => {
          drag = { x: e.clientX, y: e.clientY };
          el.setPointerCapture(e.pointerId);
        };
        const move = (e: PointerEvent) => {
          if (!drag) return;
          scene?.drag?.(e.clientX - drag.x, e.clientY - drag.y);
          drag = { x: e.clientX, y: e.clientY };
        };
        const up = () => {
          if (drag) scene?.release?.();
          drag = null;
        };
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        cleanups.push(() => {
          el.removeEventListener("pointerdown", down);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
        });
      }
      run();
    };

    // Load a screen ahead; run only while on screen.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) start().catch(() => setStatus("off"));
      },
      { rootMargin: "50% 0px" },
    );
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    near.observe(el);
    onScreen.observe(el);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const onReduce = () => {
      if (!reduced.matches) return;
      stop();
      setStatus("off");
    };
    reduced.addEventListener("change", onReduce);

    return () => {
      near.disconnect();
      onScreen.disconnect();
      reduced.removeEventListener("change", onReduce);
      stop();
    };
  }, [draggable, pointerScope]);

  return (
    <div ref={ref} className={cx("ws-stage", draggable && "ws-stage--drag", className)} data-status={status}>
      <div className="ws-stage__fallback">{fallback}</div>
    </div>
  );
}
