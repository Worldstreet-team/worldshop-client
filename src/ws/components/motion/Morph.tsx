import * as React from "react";
import type { ComponentType, ReactNode } from "react";

/*
 * React's <ViewTransition> (shipped in Next's bundled React) for shared-element morphs
 * and same-route crossfades. Where React doesn't have it (Storybook, tests) or the
 * browser lacks the View Transitions API, children render as they are.
 */
type VTProps = { name?: string; children: ReactNode; default?: string; share?: string; enter?: string; exit?: string; update?: string };
const VT = (React as unknown as { ViewTransition?: ComponentType<VTProps> }).ViewTransition;

export function Morph({ name, children, ...rest }: VTProps) {
  return VT ? (
    <VT name={name} {...rest}>
      {children}
    </VT>
  ) : (
    <>{children}</>
  );
}
