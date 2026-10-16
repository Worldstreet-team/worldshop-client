"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useMagnetic } from "@ws/components/motion/useMagnetic";
import { useFormStatus } from "react-dom";
import { LocationIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { nearestArea } from "@ws/lib/areas";

/* "Use my location" (PLAN F8): asks the browser only when tapped, maps the position to
   the nearest named area, and puts that in the area field. The position itself is
   never sent or stored. Hidden where geolocation doesn't exist. */

const noop = () => () => {};

export function UseMyLocation({ selectId }: { selectId: string }) {
  const supported = useSyncExternalStore(noop, () => "geolocation" in navigator, () => false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!supported) return null;

  const locate = () => {
    setBusy(true);
    setStatus("Finding your area…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const area = nearestArea({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const select = document.getElementById(selectId) as HTMLSelectElement | null;
        if (select) select.value = area.id;
        setStatus(`Set to ${area.label}. Apply to use it.`);
        setBusy(false);
      },
      () => {
        setStatus("Couldn't get your location. Choose an area instead.");
        setBusy(false);
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  };

  return (
    <div className="ws-shipto__locate">
      <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={locate} aria-busy={busy || undefined}>
        <LocationIcon />
        Use my location
      </button>
      <p className="ws-shipto__status" role="status">
        {status}
      </p>
    </div>
  );
}

/** The selector's submit, which says it's working while the new area loads. */
export function ApplyButton() {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref);
  return (
    <button ref={ref} type="submit" className={buttonClass({})} aria-disabled={pending || undefined} aria-busy={pending || undefined}>
      {pending ? "Applying…" : "Apply"}
    </button>
  );
}
