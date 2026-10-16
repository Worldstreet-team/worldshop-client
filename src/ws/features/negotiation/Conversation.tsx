"use client";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckCircleIcon, InfoCircleIcon, PaperAirplaneIcon, PaperclipIcon, XmarkCircleIcon } from "@ws/components/icons";
import { Avatar, buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { replyTime } from "@ws/features/listing-detail/SellerCard";
import { formatCurrency, kobo } from "@ws/lib/money";
import { unsafeMessage, type Role, type Thread } from "./model";
import { SafetyWarning, type Run } from "./OfferForm";
import type { DealListing } from "./NegotiationHub";
import { useDraft } from "./store";

const inZone = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { ...o, timeZone: rules.time.zone });
const clock = inZone({ hour: "2-digit", minute: "2-digit" });
const dayKey = inZone({ year: "numeric", month: "2-digit", day: "2-digit" });
const dayName = inZone({ weekday: "short", day: "numeric", month: "short" });
const DAY = 86_400_000;

function dayLabel(at: number, now: number) {
  const key = dayKey.format(at);
  if (key === dayKey.format(now)) return "Today";
  if (key === dayKey.format(now - DAY)) return "Yesterday";
  return dayName.format(at);
}
/** Thread-list time: the clock today, the day otherwise. */
export const shortTime = (at: number, now: number) => (dayKey.format(at) === dayKey.format(now) ? clock.format(at) : dayName.format(at));

const QUICK = ["Is this still available?", "Can you deliver to my area?", "Could you share more photos?"];
const TYPES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  listing: DealListing;
  thread?: Thread;
  role: Role;
  run: Run;
  blocked: boolean;
  error: string;
  backHref: string;
  /** Inbox only: the header button that opens the deal sheet below 1200px. */
  deal?: { open: boolean; toggle: (open: boolean) => void };
  /** Who the reader is talking to, when the thread knows (a buyer's name on the selling side). */
  who?: { name: string; status?: string };
  /** False where messages carry text only (the live chat API takes no attachments). */
  photosEnabled?: boolean;
  /** Text to start the composer with (an offer, a question carried from the listing page). */
  initialBody?: string;
};

export function Conversation({ listing, thread, role, run, blocked, error, backHref, deal, who, photosEnabled = true, initialBody }: Props) {
  const [draft, setBody] = useDraft(`${role}:${listing.id}`);
  const body = draft || initialBody || "";
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const risky = unsafeMessage(body);
  const messages = thread?.messages ?? [];
  const other = who?.name ?? (role === "buyer" ? listing.shop_name : "Buyer");
  const [now] = useState(Date.now); // "Today" labels; read once per mount

  // Keep the newest message in view, as chat apps do.
  // Stay pinned to the bottom while the reader is there, even as the composer or fonts resize the log.
  const pinned = useRef(true);
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (pinned.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { pinned.current = true; log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages.length]);

  const send = () => run({ type: "message", id: crypto.randomUUID(), body, photos, acknowledge }, () => { setBody(""); setPhotos([]); setAcknowledge(false); setPhotoError(""); });

  return <section className="ws-chat__thread" aria-label="Conversation">
    <header className="ws-chat__head">
      <Link className={buttonClass({ variant: "quiet", size: "sm", icon: true }) + " ws-chat__back"} href={backHref} aria-label="All conversations"><ArrowLeftIcon /></Link>
      <Avatar name={other} />
      <div className="ws-chat__who">
        <h2>{other}</h2>
        {role === "buyer" && listing.seller?.reply_hours !== undefined ? <p data-status>Usually replies {replyTime(listing.seller.reply_hours)}</p> : who?.status ? <p>{who.status}</p> : null}
      </div>
      {deal && <button id="deal-toggle" type="button" className={buttonClass({ variant: "quiet", size: "sm" }) + " ws-chat__deal-toggle"} aria-expanded={deal.open} aria-controls="deal-panel" onClick={() => deal.toggle(!deal.open)}><InfoCircleIcon />Deal details</button>}
    </header>

    <Link className="ws-chat__pinned" href={`/listing/${listing.id}-${listing.slug}`}>
      {listing.photo && <Image src={listing.photo.url} alt="" width={44} height={44} unoptimized />}
      <span><span className="ws-chat__pinned-title">{listing.title}</span><span className="ws-deal-muted">{formatCurrency(kobo(listing.price_minor))} asking · View listing</span></span>
    </Link>

    <div ref={log} onScroll={(e) => { const l = e.currentTarget; pinned.current = l.scrollHeight - l.scrollTop - l.clientHeight < 24; }} role="log" aria-label="Messages" aria-relevant="additions" className="ws-chat__log">
      <p className="ws-chat__notice">Keep payment and chat on WorldStore. Only payments made through WorldStore are covered.</p>
      {!messages.length && <p className="ws-chat__hint">Ask about the item, agree the details, and keep everything in one place.</p>}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayKey.format(prev.at) !== dayKey.format(m.at);
        const own = m.role === role;
        return <Fragment key={m.id}>
          {newDay && <p className="ws-chat__day"><span>{dayLabel(m.at, now)}</span></p>}
          <article className="ws-chat__msg" data-own={own} data-cont={!newDay && prev?.role === m.role}>
            <span className="cx-sr-only">{own ? "You" : m.role === "buyer" ? "Buyer" : "Seller"}: </span>
            {m.body && <p>{m.body}</p>}
            {m.photos.length > 0 && <div className="ws-chat__photos">{m.photos.map((photo, n) => <Image key={n} src={photo} alt={`Attached photo ${n + 1}`} width={160} height={120} unoptimized />)}</div>}
            <span className="ws-chat__meta"><time dateTime={new Date(m.at).toISOString()}>{clock.format(m.at)}</time>{own && <CheckCircleIcon label="Sent" />}</span>
          </article>
          {m.flagged && <p className="ws-chat__flag" data-own={own}>Safety warning acknowledged. Payment outside WorldStore is not covered.</p>}
        </Fragment>;
      })}
    </div>

    <form className="ws-chat__composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
      {error && <p className="ws-deal-warning" role="alert" tabIndex={-1} ref={(node) => node?.focus()}>{error}</p>}
      {!messages.length && !blocked && <div className="ws-chat__quick" aria-label="Suggested questions">{QUICK.map((text) => <button key={text} type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => setBody(text)}>{text}</button>)}</div>}
      {risky && <SafetyWarning checked={acknowledge} change={setAcknowledge} />}
      {blocked && <p className="ws-chat__blocked">This seller is blocked. Unblock them to send messages.</p>}
      {photoError && <p role="alert" className="ws-field__error">{photoError}</p>}
      {loading && <p role="status" className="ws-deal-muted">Reading photos…</p>}
      <div className="ws-chat__box" data-disabled={blocked}>
        {photos.length > 0 && <div className="ws-chat__photos">{photos.map((photo, i) => <span key={i} className="ws-chat__pending">
          <Image src={photo} alt={`Photo ${i + 1} to attach`} width={64} height={64} unoptimized />
          <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, n) => n !== i))}><XmarkCircleIcon /></button>
        </span>)}</div>}
        <label htmlFor="chat-message" className="cx-sr-only">Message</label>
        <textarea id="chat-message" value={body} placeholder={blocked ? "Messaging is off" : "Write a message…"} rows={1} maxLength={rules.messaging.maxChars} disabled={blocked} aria-describedby="message-help"
          onChange={(e) => { setBody(e.target.value); setAcknowledge(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <div className="ws-chat__tools">
          {photosEnabled && <label className={buttonClass({ variant: "quiet", size: "sm", icon: true }) + " ws-chat__attach"} data-disabled={blocked || loading || undefined}>
            <PaperclipIcon /><span className="cx-sr-only">Attach photos</span>
            <input type="file" className="cx-sr-only" accept={TYPES.join(",")} multiple disabled={blocked || loading} onChange={async (e) => {
              const files = Array.from(e.target.files ?? []); e.target.value = ""; setPhotoError("");
              if (files.length + photos.length > rules.messaging.maxPhotos || files.some((f) => f.size > rules.messaging.photoMaxBytes || !TYPES.includes(f.type))) { setPhotoError(`Choose up to ${rules.messaging.maxPhotos} PNG, JPEG or WebP photos, each under ${rules.messaging.photoMaxBytes / 1_000_000} MB.`); return; }
              setLoading(true);
              try {
                const data = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Photo could not be read. Choose it again to retry.")); reader.readAsDataURL(file); })));
                setPhotos((old) => [...old, ...data]);
              } catch (err) { setPhotoError(err instanceof Error ? err.message : "Photo could not be read."); } finally { setLoading(false); }
            }} />
          </label>}
          <span id="message-help" className="ws-chat__count">{body.length}/{rules.messaging.maxChars}<span className="cx-sr-only"> characters. Enter sends, Shift+Enter adds a line. Your text draft stays on this device.</span></span>
          <button className={buttonClass({ size: "sm", icon: true })} aria-label="Send message" disabled={blocked || loading || (risky && !acknowledge)}><PaperAirplaneIcon /></button>
        </div>
      </div>
    </form>
  </section>;
}
