"use client";

import { useRef, useState } from "react";
import { AirplaneIcon, LinkChainIcon, MessagesIcon, MessageTextIcon, ShareIcon, WhatsappIcon, XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";

/* ShareSheet (spec §7): the phone's own share sheet where there is one; otherwise (and
   before scripts load, via invoker commands) a sheet with Copy link, WhatsApp,
   Telegram, X and SMS. WhatsApp leads: it's how most listings get passed around. */

export const SHARE_ID = "share-listing";
const command = (action: "show-modal" | "close") => ({ commandfor: SHARE_ID, command: action }) as Record<string, string>;

type Props = { url: string; title: string; text: string };

/** Icon-only on the gallery's corner, eBay style. */
export function ShareButton({ url, title, text, className }: Props & { className?: string }) {
  return (
    <button
      type="button"
      className={buttonClass({ variant: "quiet", size: "sm", icon: true, className })}
      aria-label="Share"
      aria-haspopup="dialog"
      {...command("show-modal")}
      onClick={(e) => {
        if (typeof navigator.share !== "function") {
          // Browsers without invoker commands.
          const d = document.getElementById(SHARE_ID) as HTMLDialogElement | null;
          if (d && !d.open) d.showModal();
          return;
        }
        // Native sheet instead of ours; cancelling the click stops the invoker command.
        e.preventDefault();
        navigator.share({ title, text, url }).catch(() => {});
      }}
    >
      <ShareIcon />
    </button>
  );
}

export function ShareSheet({ url, title, text }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const message = `${text} ${url}`;
  const targets = [
    { label: "WhatsApp", icon: <WhatsappIcon />, href: `https://wa.me/?text=${encodeURIComponent(message)}` },
    { label: "Telegram", icon: <AirplaneIcon />, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { label: "X", icon: <MessagesIcon />, href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: "Text message", icon: <MessageTextIcon />, href: `sms:?body=${encodeURIComponent(message)}` },
  ];

  return (
    <dialog ref={dialog} id={SHARE_ID} className="ws-modal" aria-labelledby={`${SHARE_ID}-title`} onClick={(e) => e.target === e.currentTarget && dialog.current?.close()} onClose={() => setCopied(false)}>
      <div className="ws-modal__panel">
        <div className="ws-modal__head">
          <h2 id={`${SHARE_ID}-title`} className="ws-modal__title">
            Share this listing
          </h2>
          <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close" {...command("close")} onClick={() => dialog.current?.close()}>
            <XmarkCircleIcon />
          </button>
        </div>
        <p className="ws-share__title">{title}</p>
        <ul className="ws-share">
          <li>
            <button
              type="button"
              className="ws-share__target"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <LinkChainIcon />
              {copied ? "Link copied" : "Copy link"}
            </button>
          </li>
          {targets.map((t) => (
            <li key={t.label}>
              <a className="ws-share__target" href={t.href} target="_blank" rel="noopener noreferrer">
                {t.icon}
                {t.label}
                <span className="cx-sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <span className="cx-sr-only" role="status">
          {copied ? "Link copied" : ""}
        </span>
      </div>
    </dialog>
  );
}
