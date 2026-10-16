"use client";

import { useRouter } from "next/navigation";
import { startTransition, useSyncExternalStore } from "react";
import { WarningIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";

/* A segment error (R-007): say what failed in plain words, offer Try again (re-fetch
   the server data, then re-render), and always leave a search box as a way on. */

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function RouteError({ what, reset }: { what: string; reset: () => void }) {
  const router = useRouter();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <div className="ws-route-error">
      <EmptyState
        icon={<WarningIcon />}
        tone="error"
        title={online ? `Couldn't load ${what}` : "You're offline"}
        headingLevel="h1"
        action={
          <button
            type="button"
            className={buttonClass({ variant: "ghost" })}
            onClick={() =>
              startTransition(() => {
                router.refresh();
                reset();
              })
            }
          >
            Try again
          </button>
        }
      >
        {online ? "Check your connection and try again." : "Reconnect to see the latest listings."}
      </EmptyState>
      <form action="/search" role="search" className="ws-route-error__search">
        <input type="search" name="q" aria-label="Search for anything" placeholder="Search for anything" className="ws-select" />
        <button type="submit" className={buttonClass({ variant: "ghost" })}>
          Search
        </button>
      </form>
    </div>
  );
}
