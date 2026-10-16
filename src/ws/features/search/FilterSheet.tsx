"use client";

import { useId, useRef, type ReactNode } from "react";
import { SlidersIcon, XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";

/* FilterSheet (spec §6, flows B2 step 4): the "Filters" button in the phone bar and a
   full-height sheet holding the filter form, with "Show N results" fixed at the
   bottom. A native modal dialog opened with invoker commands, so it works before
   scripts load; Escape closes it and focus goes back to the button. */

const command = (id: string, action: "show-modal" | "close") => ({ commandfor: id, command: action }) as Record<string, string>;

export function FilterSheet({ count, children }: { count: number; children: ReactNode }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={buttonClass({ variant: "ghost", size: "sm", className: "ws-filterbar__filters" })}
        aria-haspopup="dialog"
        {...command(id, "show-modal")}
        onClick={() => !dialog.current?.open && dialog.current?.showModal()}
      >
        <SlidersIcon />
        Filters
        {count > 0 && (
          <span className="ws-filterbar__n">
            {count}
            <span className="cx-sr-only"> applied</span>
          </span>
        )}
      </button>
      <dialog ref={dialog} id={id} className="ws-fsheet" aria-labelledby={`${id}-title`} onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
        <div className="ws-fsheet__panel">
          <div className="ws-fsheet__head">
            <h2 id={`${id}-title`} className="ws-fsheet__title">
              Filters
            </h2>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close filters" {...command(id, "close")} onClick={() => dialog.current?.close()}>
              <XmarkCircleIcon />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
