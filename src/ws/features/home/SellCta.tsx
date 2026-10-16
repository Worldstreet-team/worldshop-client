"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRightIcon, StoreIcon } from "@ws/components/icons";
import { useMagnetic } from "@ws/components/motion/useMagnetic";
import { buttonClass, IconTile } from "@ws/components/ui";
import { ESCROW } from "@ws/lib/copy/escrow";

/* SellCTABlock (spec §4 "Open your shop in minutes"): the DS CTA block over a slow
   gold aurora ribbon (one of the DS loops; still under reduced motion). The button is
   ghost: the page's one solid gold button is Search (spec §1.1). */
export function SellCta() {
  const cta = useRef<HTMLAnchorElement>(null);
  useMagnetic(cta);
  return (
    <section className="ws-sell" aria-labelledby="home-sell">
      <div className="ws-sell__aurora" aria-hidden="true">
        <span />
        <span />
      </div>
      <IconTile>
        <StoreIcon />
      </IconTile>
      <div className="ws-sell__text">
        <h2 id="home-sell" className="ws-sell__title">
          Open your shop in minutes
        </h2>
        <p className="ws-sell__body">Snap a few photos, set your price and choose how buyers get it. {ESCROW.payout}</p>
      </div>
      <Link ref={cta} href="/vendor" className={buttonClass({ variant: "ghost", arrow: true, className: "ws-sell__cta" })}>
        Start selling
        <ArrowRightIcon />
      </Link>
    </section>
  );
}
