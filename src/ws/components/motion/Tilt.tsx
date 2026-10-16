"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/* Cards tilt a few degrees towards the pointer and lift (DS TiltCard pattern, owner's
   expressive choice). CSS variables only, so it costs one style write per frame; CSS
   does the easing and limits it to hover devices without reduced motion. */
export function Tilt({ children, max = 4 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ws-rx", `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty("--ws-ry", `${(x * max).toFixed(2)}deg`);
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--ws-rx", "0deg");
    ref.current?.style.setProperty("--ws-ry", "0deg");
  };

  return (
    <div ref={ref} className="ws-tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
