"use client";

import { useState, type ReactNode } from "react";
import { Tabs, tabPanelProps } from "@ws/components/ui";

/* The shop page's Items / Reviews / About tabs (spec §13). The panels are rendered on
   the server and passed in; the chosen tab is kept in the URL (?tab=, R-011) so a shared
   or reloaded link opens the same tab, without a round trip on each switch. */

export type ShopTab = "items" | "reviews" | "about";

type Props = {
  initial: ShopTab;
  labels: Record<ShopTab, string>;
  panels: Record<ShopTab, ReactNode>;
};

export function ShopTabs({ initial, labels, panels }: Props) {
  const [tab, setTab] = useState<ShopTab>(initial);
  const choose = (next: ShopTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "items") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };
  return (
    <div className="ws-shoptabs">
      <Tabs
        aria-label="Shop sections"
        variant="line"
        idBase="shop"
        value={tab}
        onChange={choose}
        items={(["items", "reviews", "about"] as const).map((value) => ({ value, label: labels[value] }))}
      />
      <div {...tabPanelProps("shop", tab)} className="ws-shoptabs__panel">
        {panels[tab]}
      </div>
    </div>
  );
}
