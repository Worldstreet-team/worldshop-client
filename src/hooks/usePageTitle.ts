import { useEffect } from 'react';

const SITE = 'WorldStreet Shop';

/**
 * Per-route document titles. Every page shares one static <title> otherwise,
 * so history, tabs and shared links all read "WorldShop — Marketplace".
 * Pass nothing for the home page; pass a value once it is known (a listing
 * title arrives after fetch — the effect re-runs when it does).
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} — Buy & sell across Nigeria`;
    return () => {
      document.title = `${SITE} — Buy & sell across Nigeria`;
    };
  }, [title]);
}
