"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { useMagnetic } from "@ws/components/motion/useMagnetic";
import { buttonClass } from "@ws/components/ui";

/*
 * Instant feedback for in-page search changes (UI research: NN/g skeletons and
 * progress indicators). Sort, filter chips, wider-area and Show more are plain links
 * to /search?…, so they work without JS. With JS, a click on one is caught here and
 * run as a transition: the current results stay on screen, dimmed, with a progress
 * bar, instead of a tap that seems to do nothing on a slow network. Modified clicks
 * (new tab, etc.) are left to the browser.
 */

type Pending = { pending: boolean; kind: "more" | "change" | null };
const PendingContext = createContext<Pending>({ pending: false, kind: null });

export function SearchTransitions({ pathname, children }: { pathname: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<Pending["kind"]>(null);

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== pathname) return;
    e.preventDefault();
    if (pending) return; // a second tap while loading does nothing
    const more = a.dataset.showMore !== undefined;
    setKind(more ? "more" : "change");
    start(() => router.push(url.pathname + url.search, { scroll: !more }));
  };

  return (
    <PendingContext.Provider value={{ pending, kind: pending ? kind : null }}>
      <div className="ws-search-page" data-pending={pending ? kind ?? "change" : undefined} aria-busy={pending || undefined} onClickCapture={onClickCapture}>
        <div className="ws-progress" aria-hidden="true" />
        {children}
      </div>
    </PendingContext.Provider>
  );
}

/** "Show more results", which says it's loading and can't be double-tapped. */
export function ShowMoreLink({ href }: { href: string }) {
  const { kind } = useContext(PendingContext);
  const loading = kind === "more";
  const ref = useRef<HTMLAnchorElement>(null);
  useMagnetic(ref);
  return (
    <a ref={ref} href={href} data-show-more className={buttonClass({ variant: "ghost" })} aria-disabled={loading || undefined} aria-busy={loading || undefined}>
      {loading ? "Loading more…" : "Show more results"}
    </a>
  );
}
