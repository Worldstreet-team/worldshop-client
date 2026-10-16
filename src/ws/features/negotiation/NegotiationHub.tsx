"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChatDotsIcon, CheckShieldIcon, MagnifyingGlassIcon } from "@ws/components/icons";
import { Avatar, buttonClass, Tabs } from "@ws/components/ui";
import { requireAuth, useSession } from "@ws/features/auth/session";
import { VerifiedTick } from "@ws/features/listing-card/atoms/Seller";
import { replyTime } from "@ws/features/listing-detail/SellerCard";
import type { SellerProfile } from "@ws/lib/data/types";
import type { Context, Role } from "./model";
import { offersLeft, remainingStock } from "./model";
import { dispatch, useNegotiations } from "./store";
import { OfferForm, type Run } from "./OfferForm";
import { OfferCard } from "./OfferCard";
import { Conversation, shortTime } from "./Conversation";

export type DealListing = Context["listing"] & {
  title: string;
  slug: string;
  shop_name: string;
  photo?: { url: string; alt: string };
  seller?: Pick<SellerProfile, "handle" | "verified" | "top_rated" | "feedback" | "reply_hours" | "joined_at">;
};

const OFFER_LABEL: Record<string, string> = { pending: "Offer pending", countered: "Countered", accepted: "Accepted", paid: "Paid" };

/* Inbox and Offers share one three-pane layout (ref: desktop chat apps): conversations,
   the thread, and the deal beside it. Below 1200px the deal panel opens as a sheet from
   the thread header on Inbox, and sits above the thread on Offers, where it's the point. */
export function NegotiationHub({ listings, selected, mode, qty = 1, initialRole = "buyer" }: { listings: DealListing[]; selected?: string; mode: "offers" | "inbox"; qty?: number; initialRole?: Role }) {
  const state = useNegotiations();
  const { signedIn } = useSession();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "offers">("all");
  const [dealOpen, setDealOpen] = useState(false);
  const listing = listings.find((l) => l.id === selected);
  const thread = state.threads.find((t) => t.id === selected);
  const offers = state.offers.filter((o) => o.listing_id === selected);
  const active = offers.some((o) => ["pending", "countered", "accepted"].includes(o.status));
  const available = listing ? remainingStock(state, listing) : 0;
  const blocked = !!listing && state.blocked.includes(listing.seller_id);
  const escrow = !!listing && !["vehicles", "property"].includes(listing.category_id);
  const run: Run = (command, done) => {
    if (!listing) return;
    setError("");
    requireAuth(mode === "offers" ? "manage offers" : "send messages", () => {
      try { dispatch(command, { listing, role, now: Date.now() }); done?.(); }
      catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    });
  };

  const q = query.trim().toLowerCase();
  const rows = state.threads
    .map((t) => ({ t, item: listings.find((l) => l.id === t.id), offer: state.offers.findLast((o) => o.listing_id === t.id) }))
    .filter(({ offer }) => (mode === "offers" || filter === "offers" ? !!offer : true))
    .filter(({ t, item }) => !q || [item?.shop_name, item?.title, t.messages.at(-1)?.body].some((s) => s?.toLowerCase().includes(q)))
    .sort((a, b) => (b.t.messages.at(-1)?.at ?? b.t.created_at) - (a.t.messages.at(-1)?.at ?? a.t.created_at));
  const href = (id: string) => (mode === "inbox" ? `/inbox/${id}` : `/offers?listing=${id}`);
  const [now] = useState(Date.now); // "Today" labels; read once per mount

  return <div className="ws-deal-page ws-chat-page">
    <div className="ws-chat-top">
      <h1>{mode === "offers" ? "Offers" : "Inbox"}</h1>
      <div className="ws-deal-demo"><p>Demo · Conversations stay on this device. Nothing reaches real sellers and payments are simulated.</p><label>Demo perspective <select value={role} onChange={(e) => { setRole(e.target.value as Role); setError(""); }}><option value="buyer">Buyer</option><option value="seller">Seller</option></select></label></div>
      <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={mode === "offers" ? "/inbox" : "/offers"}>{mode === "offers" ? "Inbox" : "Offers"}</Link>
    </div>
    <div className="ws-chat" data-selected={!!listing} data-mode={mode}>
      <nav className="ws-chat__list" aria-label={mode === "offers" ? "Offer conversations" : "Conversations"}>
        <div className="ws-chat__list-head">
          <h2>{mode === "offers" ? "Your offers" : "Messages"}</h2>
          <label className="ws-chat__search"><MagnifyingGlassIcon /><span className="cx-sr-only">Search conversations</span><input type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          {mode === "inbox" && <Tabs aria-label="Show" items={[{ value: "all", label: "All" }, { value: "offers", label: "With offers" }]} value={filter} onChange={setFilter} />}
        </div>
        {!rows.length && <p className="ws-chat__none">{state.threads.length ? "No conversations match." : signedIn ? "No conversations yet." : "Sign in when you’re ready to send your first message or offer."}</p>}
        <ul>{rows.map(({ t, item, offer }) => {
          const last = t.messages.at(-1);
          return <li key={t.id}><Link href={href(t.id)} aria-current={selected === t.id ? "page" : undefined} className="ws-chat__row">
            {item?.photo ? <Image src={item.photo.url} alt="" width={48} height={48} className="ws-chat__thumb" unoptimized /> : <span className="ws-chat__thumb" />}
            <span className="ws-chat__row-main">
              <span className="ws-chat__row-top"><strong>{item?.shop_name ?? "Unavailable listing"}</strong>{last && <time dateTime={new Date(last.at).toISOString()}>{shortTime(last.at, now)}</time>}</span>
              <span className="ws-chat__row-title">{item?.title ?? t.id}</span>
              <span className="ws-chat__row-last">{offer && OFFER_LABEL[offer.status] && <span className="ws-chat__row-tag">{OFFER_LABEL[offer.status]}</span>}{last?.body}</span>
            </span>
          </Link></li>;
        })}</ul>
      </nav>
      {listing ? <>
        <Conversation key={`${listing.id}:${role}`} listing={listing} thread={thread} role={role} run={run} blocked={blocked} error={error}
          backHref={mode === "offers" ? "/offers" : "/inbox"} deal={mode === "inbox" ? { open: dealOpen, toggle: setDealOpen } : undefined} />
        <aside id="deal-panel" className="ws-chat__deal" aria-label="Deal details" data-open={dealOpen}
          onKeyDown={(e) => { if (e.key === "Escape" && dealOpen) { setDealOpen(false); document.getElementById("deal-toggle")?.focus(); } }}>
          {mode === "inbox" && <div className="ws-chat__sheet-head"><span>Deal details</span><button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => { setDealOpen(false); document.getElementById("deal-toggle")?.focus(); }}>Close</button></div>}
          <div className="ws-chat__seller">
            <Avatar name={listing.shop_name} size="xl" />
            <h2>{listing.shop_name} {listing.seller?.verified && <VerifiedTick />}</h2>
            {listing.seller && <p className="ws-deal-muted">{listing.seller.feedback.positive_percent}% positive · {listing.seller.feedback.count.toLocaleString("en-NG")} ratings</p>}
            {listing.seller?.reply_hours !== undefined && <p className="ws-deal-muted">Usually replies {replyTime(listing.seller.reply_hours)}</p>}
            {listing.seller && <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/seller/${listing.seller.handle}`}>Visit shop</Link>}
          </div>
          {available === 0 && <p role="status">No more stock is available for a new deal.</p>}
          {mode === "offers" && role === "buyer" && !active && !blocked && available > 0 && listing.status === "live" && <OfferForm key={listing.id} price={listing.price_minor} qty={Math.min(qty, available)} available={available} left={offersLeft(state, listing.id)} run={run} />}
          {offers.slice().reverse().map((offer) => <OfferCard key={offer.id} offer={offer} request={state.requests.find((r) => r.offer_id === offer.id)} role={role} run={run} blocked={blocked} escrow={escrow} />)}
          {mode === "inbox" && !active && !blocked && available > 0 && listing.status === "live" && <Link className={buttonClass({})} href={`/offers?listing=${listing.id}`}>Make offer</Link>}
          {escrow && <p className="ws-chat__protect"><CheckShieldIcon />Pay only through the seller’s WorldStore payment request. That money is held in escrow until you confirm the item.</p>}
          {role === "buyer" && <div className="ws-deal-actions">
            <button className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => run({ type: "block", id: crypto.randomUUID(), blocked: !blocked })}>{blocked ? "Unblock seller" : "Block seller"}</button>
            <button className={buttonClass({ variant: "quiet", size: "sm" })} disabled={blocked || thread?.reported} onClick={() => run({ type: "report", id: crypto.randomUUID() })}>{thread?.reported ? "Flagged in demo" : "Report conversation"}</button>
          </div>}
        </aside>
        {dealOpen && <div className="ws-chat__scrim" aria-hidden="true" onClick={() => setDealOpen(false)} />}
      </> : <section className="ws-chat__empty" aria-label="No conversation selected">
        <ChatDotsIcon />
        <h2>{selected ? "This listing is unavailable" : "A good deal starts with a conversation"}</h2>
        <p>{selected ? "Choose another conversation or browse available listings." : "Choose a conversation, or find something you like and message the seller."}</p>
        <Link className={buttonClass({ variant: "ghost" })} href="/search">Browse listings</Link>
      </section>}
    </div>
  </div>;
}
