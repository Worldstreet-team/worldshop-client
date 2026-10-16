"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChatDotsIcon, CheckShieldIcon, MagnifyingGlassIcon } from "@ws/components/icons";
import { Avatar, buttonClass, Tabs } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { requireAuth, signIn, useSession } from "@ws/features/auth/session";
import { VerifiedTick } from "@ws/features/listing-card/atoms/Seller";
import { replyTime } from "@ws/features/listing-detail/SellerCard";
import { formatCurrency, kobo } from "@ws/lib/money";
import type { Role } from "./model";
import { Conversation, shortTime } from "./Conversation";
import type { DealListing } from "./NegotiationHub";
import { OfferForm, type Run } from "./OfferForm";
import { errorText, listingFromConversation, threadHref, toThread, useConversations, useMarkRead, useSend, useThread } from "./live";

/*
 * NegotiationHub's three-pane inbox on the marketplace's chat API: conversations, the
 * thread, and the listing and seller beside it.
 *
 * What changed from the reference, and why:
 * - Its demo "perspective" switch is the real Buying / Selling split: one account can
 *   be both a buyer and a shop, and those are separate inboxes.
 * - There is no offers service. The offer form still works, and sends the offer as a
 *   message the seller can answer; payment requests, blocking and attachments are not
 *   offered, since nothing behind them exists yet.
 *
 * `selected` is a conversation id; `listing` (from ?listing=) starts a new conversation
 * about that listing when the buyer has none yet.
 */

type Props = {
  listings: DealListing[];
  selected?: string;
  listingId?: string;
  mode: "offers" | "inbox";
  initialRole?: Role;
};

export function LiveHub({ listings, selected, listingId, mode, initialRole = "buyer" }: Props) {
  const router = useRouter();
  const { signedIn, loaded } = useSession();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dealOpen, setDealOpen] = useState(false);
  const [now] = useState(Date.now); // "Today" labels; read once per mount

  const list = useConversations(role, signedIn);
  const conversations = useMemo(() => list.data ?? [], [list.data]);
  // Opening a listing's conversation: reuse the buyer's existing thread about it.
  const existing = listingId && role === "buyer" ? conversations.find((c) => c.listing?.id === listingId) : undefined;
  const threadId = selected ?? existing?.id;
  const detail = useThread(threadId, signedIn);
  const summary = conversations.find((c) => c.id === threadId) ?? detail.data;
  const markRead = useMarkRead();

  useEffect(() => {
    if (existing && !selected) router.replace(threadHref(existing.id));
  }, [existing, selected, router]);

  const unread = summary?.unread ?? 0;
  useEffect(() => {
    if (threadId && unread > 0) markRead.mutate(threadId);
    // markRead is a new object each render; the id and count are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, unread]);

  // The listing in view: from the live catalogue where it still is (it has the seller's
  // profile), else from the conversation's own copy, else the one being asked about.
  const listingKey = summary?.listing?.id ?? listingId;
  const listing = listings.find((l) => l.id === listingKey) ?? (summary ? listingFromConversation(summary) : undefined);
  const thread = detail.data ? toThread(detail.data) : undefined;
  const send = useSend((id) => router.replace(threadHref(id)));

  const deliver = (body: string, done?: () => void) => {
    if (!listing) return;
    setError("");
    requireAuth(mode === "offers" ? "make an offer" : "send messages", () => {
      send.mutate(
        { conversationId: threadId, listingId: listing.id, body },
        { onSuccess: () => done?.(), onError: (e) => setError(errorText(e)) },
      );
    });
  };

  const run: Run = (command, done) => {
    if (command.type === "message") {
      if (!command.body.trim()) return;
      deliver(command.body.trim(), done);
    } else if (command.type === "offer") {
      const ask = listing?.price_minor ?? 0;
      if (!Number.isSafeInteger(command.amount_minor) || command.amount_minor <= 0 || (ask > 0 && command.amount_minor > ask)) {
        setError(ask > 0 ? `Offer up to the asking price of ${formatCurrency(kobo(ask))}.` : "Enter an amount to offer.");
        return;
      }
      const each = formatCurrency(kobo(command.amount_minor));
      const text = [`Offer: ${each}${command.qty > 1 ? ` each for ${command.qty}` : ""}.`, command.note.trim()].filter(Boolean).join("\n");
      deliver(text, done);
    }
  };

  const q = query.trim().toLowerCase();
  const rows = conversations
    .filter((c) => (mode === "offers" ? /^Offer: /m.test(c.lastMessage?.body ?? "") : true))
    .filter((c) => !q || [c.store.name, c.buyer?.name, c.listing?.name, c.lastMessage?.body].some((s) => s?.toLowerCase().includes(q)));
  const counterpart = (c: (typeof conversations)[number]) => (role === "buyer" ? c.store.name : (c.buyer?.name ?? "Buyer"));
  const escrow = !!listing && !["vehicles", "property"].includes(listing.category_id);
  const pending = !!listingId && !threadId;

  if (loaded && !signedIn) {
    return (
      <div className="ws-deal-page ws-chat-page">
        <div className="ws-chat-top">
          <h1>{mode === "offers" ? "Offers" : "Inbox"}</h1>
        </div>
        <section className="ws-chat__empty" aria-label="Sign in">
          <ChatDotsIcon />
          <h2>Sign in to see your messages</h2>
          <p>Conversations with sellers and buyers are kept with your WorldStreet account.</p>
          <button type="button" className={buttonClass({})} onClick={signIn}>
            Sign in
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="ws-deal-page ws-chat-page">
      <div className="ws-chat-top">
        <h1>{mode === "offers" ? "Offers" : "Inbox"}</h1>
        <Tabs
          aria-label="Inbox"
          items={[
            { value: "buyer", label: "Buying" },
            { value: "seller", label: "Selling" },
          ]}
          value={role}
          onChange={(next) => {
            setRole(next as Role);
            setError("");
            if (selected) router.push(mode === "offers" ? "/offers" : "/inbox");
          }}
        />
      </div>
      <div className="ws-chat" data-selected={!!listing} data-mode={mode}>
        <nav className="ws-chat__list" aria-label={mode === "offers" ? "Offer conversations" : "Conversations"}>
          <div className="ws-chat__list-head">
            <h2>{mode === "offers" ? "Your offers" : "Messages"}</h2>
            <label className="ws-chat__search">
              <MagnifyingGlassIcon />
              <span className="cx-sr-only">Search conversations</span>
              <input type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          {!rows.length && (
            <p className="ws-chat__none">
              {list.isPending && signedIn ? "Loading conversations…" : conversations.length ? "No conversations match." : role === "buyer" ? "No conversations yet. Message a seller from any listing." : "No buyers have messaged your shop yet."}
            </p>
          )}
          <ul>
            {rows.map((c) => {
              const last = c.lastMessage;
              const at = Date.parse(last?.createdAt ?? c.lastMessageAt);
              const photo = c.listing ? listingFromConversation(c)?.photo : undefined;
              return (
                <li key={c.id}>
                  <Link href={threadHref(c.id)} aria-current={threadId === c.id ? "page" : undefined} className="ws-chat__row">
                    {photo ? <Image src={photo.url} alt="" width={48} height={48} className="ws-chat__thumb" unoptimized /> : <span className="ws-chat__thumb" />}
                    <span className="ws-chat__row-main">
                      <span className="ws-chat__row-top">
                        <strong>{counterpart(c)}</strong>
                        <time dateTime={new Date(at).toISOString()}>{shortTime(at, now)}</time>
                      </span>
                      <span className="ws-chat__row-title">{c.listing?.name ?? "Listing no longer available"}</span>
                      <span className="ws-chat__row-last">
                        {c.unread > 0 && <span className="ws-chat__row-tag">{c.unread} new</span>}
                        {last?.body}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {listing ? (
          <>
            <Conversation
              key={`${threadId ?? listing.id}:${role}`}
              listing={listing}
              thread={thread}
              role={role}
              run={run}
              blocked={false}
              error={error}
              backHref={mode === "offers" ? "/offers" : "/inbox"}
              deal={mode === "inbox" ? { open: dealOpen, toggle: setDealOpen } : undefined}
              who={summary ? { name: counterpart(summary), status: role === "seller" ? `About ${summary.listing?.name ?? "a listing"}` : undefined } : undefined}
              photosEnabled={false}
            />
            <aside
              id="deal-panel"
              className="ws-chat__deal"
              aria-label="Deal details"
              data-open={dealOpen}
              onKeyDown={(e) => {
                if (e.key === "Escape" && dealOpen) {
                  setDealOpen(false);
                  document.getElementById("deal-toggle")?.focus();
                }
              }}
            >
              {mode === "inbox" && (
                <div className="ws-chat__sheet-head">
                  <span>Deal details</span>
                  <button
                    type="button"
                    className={buttonClass({ variant: "quiet", size: "sm" })}
                    onClick={() => {
                      setDealOpen(false);
                      document.getElementById("deal-toggle")?.focus();
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
              <div className="ws-chat__seller">
                <Avatar name={listing.shop_name} size="xl" />
                <h2>
                  {listing.shop_name} {listing.seller?.verified && <VerifiedTick />}
                </h2>
                {listing.seller && listing.seller.feedback.count > 0 && (
                  <p className="ws-deal-muted">
                    {listing.seller.feedback.positive_percent}% positive · {listing.seller.feedback.count.toLocaleString("en-NG")} ratings
                  </p>
                )}
                {listing.seller?.reply_hours !== undefined && <p className="ws-deal-muted">Usually replies {replyTime(listing.seller.reply_hours)}</p>}
                {listing.seller && (
                  <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/seller/${listing.seller.handle}`}>
                    Visit shop
                  </Link>
                )}
              </div>
              {pending && <p className="ws-deal-muted">Your first message starts the conversation. The seller is notified straight away.</p>}
              {mode === "offers" && role === "buyer" && listing.status === "live" && listing.price_minor > 0 && (
                <OfferForm key={listing.id} price={listing.price_minor} qty={1} available={Math.max(1, listing.qty)} left={rules.offers.perListing} run={run} asMessage />
              )}
              {mode === "inbox" && role === "buyer" && listing.status === "live" && listing.price_minor > 0 && (
                <Link className={buttonClass({})} href={`/offers?listing=${listing.id}`}>
                  Make offer
                </Link>
              )}
              {escrow && (
                <p className="ws-chat__protect">
                  <CheckShieldIcon />
                  Meet somewhere public and see the item before you pay. Never send money to hold an item.
                </p>
              )}
            </aside>
            {dealOpen && <div className="ws-chat__scrim" aria-hidden="true" onClick={() => setDealOpen(false)} />}
          </>
        ) : (
          <section className="ws-chat__empty" aria-label="No conversation selected">
            <ChatDotsIcon />
            <h2>{selected && detail.isError ? "This conversation isn't available" : "A good deal starts with a conversation"}</h2>
            <p>{selected && detail.isError ? "Choose another conversation or browse listings." : "Choose a conversation, or find something you like and message the seller."}</p>
            <Link className={buttonClass({ variant: "ghost" })} href="/search">
              Browse listings
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
