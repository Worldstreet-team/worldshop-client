"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DocumentsIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";

/* DescriptionBlock (spec §7, F4): the seller's text as plain paragraphs (React escapes
   it, so no seller HTML reaches the page), clamped at 12 lines with "Read more". The
   clamp is decided on the server from the length, so nothing shifts on load; after
   mount the button goes if the text turns out to fit. */

const CHARS_PER_LINE = 60;

export function DescriptionBlock({ text }: { text: string }) {
  const id = useId();
  const body = useRef<HTMLDivElement>(null);
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const lines = rules.listing.descriptionLines;
  const [long, setLong] = useState(text.length > lines * CHARS_PER_LINE || text.split("\n").length > lines);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = body.current;
    if (!el || open) return;
    const id = requestAnimationFrame(() => setLong(el.scrollHeight > el.clientHeight + 1));
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="ws-subtitle">
        Item description from the seller
      </h3>
      <div ref={body} id={`${id}-body`} className="ws-desc" data-clamped={long && !open ? true : undefined} style={{ "--ws-desc-lines": lines } as React.CSSProperties}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </section>
  );
}

/* ListingMeta (spec §7): the item number with a copy button (what buyers quote to
   support), and when it was listed. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <span className="cx-copy ws-copy" data-copied={copied}>
      <span className="cx-num">{value}</span>
      <button
        type="button"
        className={buttonClass({ variant: "quiet", size: "sm", icon: true })}
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            // No clipboard permission: the number is on screen to copy by hand.
          }
        }}
      >
        <DocumentsIcon />
      </button>
      <span className="cx-sr-only" role="status">
        {copied ? `${label} copied` : ""}
      </span>
    </span>
  );
}
