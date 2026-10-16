"use client";

import { useEffect } from "react";

/* Marks <html data-scrolling> while the document is being scrolled, so hover effects,
   the 3D stage and looping brand motion can stand down mid-scroll and resume after.
   Without this, every card that passes under a still pointer enters :hover and starts
   its tilt, lift and photo transitions: measured 378ms of style work per scroll on
   /search versus 22ms with the pointer off the grid.

   It writes only when scrolling starts and stops (never per frame), and listens to the
   window only, so horizontal rails don't trigger it. It ends after a quiet spell rather
   than on `scrollend`, which fires after every mouse-wheel notch: that flipped the
   attribute ~90 times in one scroll and restyled every card each time. */
export const SCROLLING_EVENT = "ws:scrolling";
/** Scrolling counts as over after this long without a scroll event (spans wheel notches). */
const QUIET_MS = 180;

export function isScrolling() {
  return document.documentElement.dataset.scrolling === "true";
}

export function ScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let timer = 0;
    const set = (on: boolean) => {
      if (isScrolling() === on) return;
      if (on) root.dataset.scrolling = "true";
      else delete root.dataset.scrolling;
      window.dispatchEvent(new Event(SCROLLING_EVENT));
    };
    const end = () => {
      clearTimeout(timer);
      set(false);
    };
    const onScroll = () => {
      set(true);
      clearTimeout(timer);
      timer = window.setTimeout(end, QUIET_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      end();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
