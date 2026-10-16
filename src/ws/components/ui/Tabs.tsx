"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@ws/lib/cx";

/* DS Tabs (`.cx-tabs` / `.cx-tab`): a roving-focus tablist with the DS sample's API
   (`items`, `value`, `onChange`). ← → Home End move and select (automatic activation).
   Pass `idBase` when the tabs switch panels: each tab then controls the panel that
   tabPanelProps(idBase, value) labels, as the ARIA tabs pattern requires. `slide` adds
   the DS sliding thumb, measured once per change and moved with a transform. */

export type TabItem<V extends string> = { value: V; label: ReactNode };

type TabsProps<V extends string> = {
  items: readonly TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  "aria-label": string;
  variant?: "segmented" | "line";
  slide?: boolean;
  idBase?: string;
  className?: string;
};

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const panelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

/** Props for the panel a tab controls. */
export function tabPanelProps(idBase: string, value: string) {
  return { role: "tabpanel", id: panelId(idBase, value), "aria-labelledby": tabId(idBase, value), tabIndex: 0 } as const;
}

export function Tabs<V extends string>({ items, value, onChange, variant = "segmented", slide, idBase, className, ...rest }: TabsProps<V>) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!slide) return;
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    list.style.setProperty("--x", `${tab.offsetLeft}px`);
    list.style.setProperty("--w", `${tab.offsetWidth}px`);
  }, [slide, value, items]);

  const onKeyDown = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.value === value);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = items[(to + items.length) % items.length];
    onChange(next.value);
    listRef.current?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={rest["aria-label"]}
      className={cx("cx-tabs", variant === "line" && "cx-tabs--line", slide && "cx-tabs--slide", className)}
      onKeyDown={onKeyDown}
    >
      {items.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            className="cx-tab"
            data-value={t.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            {...(idBase && { id: tabId(idBase, t.value), "aria-controls": panelId(idBase, t.value) })}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
