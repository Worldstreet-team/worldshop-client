import type * as THREE_NS from "three";

/** What a scene module gets to build with. Colours come from the DS tokens on the stage. */
export type SceneContext = {
  THREE: typeof THREE_NS;
  renderer: THREE_NS.WebGLRenderer;
  width: number;
  height: number;
  colors: { ember: string; text: string };
};

/** A running scene. `frame` advances and renders; times are in seconds. */
export type Scene = {
  frame(time: number, delta: number): void;
  resize(width: number, height: number): void;
  /** Pointer position over the stage, -1..1 on both axes (y up). */
  pointer?(x: number, y: number): void;
  /** Pointer drag, in px since the last call (the listing viewer spins with it). */
  drag?(dx: number, dy: number): void;
  /** The drag ended. */
  release?(): void;
  /** Move to a step (the hero turns to face each carousel slide). */
  step?(index: number): void;
  dispose(): void;
};

export type SceneFactory = (ctx: SceneContext) => Scene;
