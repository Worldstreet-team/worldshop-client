"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DotsVerticalIcon, FlagIcon, ShareIcon } from "@ws/components/icons";
import { buttonClass, Menu } from "@ws/components/ui";
import { SaveButton } from "@ws/features/listing-card/atoms";
import { REPORT_ID } from "./ReportListing";
import { SHARE_ID } from "./ShareSheet";

/* StickyBuyBar (spec §7, §3.2): on phones, once the buy box's buttons scroll out of
   view, the price, the total and the main action stay at the bottom in place of the
   bottom nav. The total is the same figure the buy box shows (R-020). The overflow
   holds Share and Report (flows B3). */

const openDialog = (id: string) => {
  const d = document.getElementById(id) as HTMLDialogElement | null;
  if (d && !d.open) d.showModal();
};
type Props = {
  watch: string;
  listingId: string;
  title: string;
  price: string;
  price_minor: number;
  total?: string;
  action: { label: string; href: string };
  share: { url: string; title: string; text: string };
};

export function StickyBuyBar({ watch, listingId, title, price, price_minor, total, action, share }: Props) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // The main button in the buy box; under the sticky header counts as out of view.
    const box = document.getElementById(watch);
    const target = box?.querySelector<HTMLElement>("a, button") ?? box;
    if (!target) return;
    const offset = parseFloat(getComputedStyle(document.body).getPropertyValue("--cx-sticky-offset")) || 0;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < offset), { rootMargin: `-${offset}px 0px 0px 0px` });
    io.observe(target);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div className="ws-stickybuy" data-shown={shown} aria-hidden={!shown} inert={!shown}>
      <div className="ws-stickybuy__price">
        <span className="ws-stickybuy__now cx-num">{price}</span>
        {total && <span className="ws-stickybuy__total">{total}</span>}
      </div>
      <Menu
        label="More actions"
        trigger={<DotsVerticalIcon />}
        items={[
          {
            label: "Share",
            icon: <ShareIcon />,
            onSelect: () => (typeof navigator.share === "function" ? navigator.share(share).catch(() => {}) : openDialog(SHARE_ID)),
          },
          { label: "Report this listing", icon: <FlagIcon />, onSelect: () => openDialog(REPORT_ID) },
        ]}
      />
      <SaveButton listingId={listingId} title={title} price_minor={price_minor} />
      <Link href={action.href} className={buttonClass({ size: "sm" })}>
        {action.label}
      </Link>
    </div>
  );
}
