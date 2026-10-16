import { rules } from "@ws/config/marketplace-rules";
import type { Listing } from "@ws/lib/data/types";
import { formatCurrency, kobo, toMinor } from "@ws/lib/money";
import { next, type OfferEvent, type OfferStatus } from "@ws/lib/machines/offer";
import { canPayRequest, nextPaymentRequest, type PaymentRequestEvent, type PaymentRequestStatus } from "@ws/lib/machines/payment-request";

export type Role = "buyer" | "seller";
export type Message = { id: string; role: Role; body: string; photos: string[]; at: number; flagged: boolean };
export type Thread = { id: string; seller_id: string; created_at: number; messages: Message[]; reported: boolean };
export type Offer = { id: string; listing_id: string; amount_minor: number; qty: number; attempts: number; status: OfferStatus; expires_at: number };
export type PaymentRequest = {
  id: string;
  offer_id: string;
  unit_minor: number;
  qty: number;
  item_subtotal_minor: number;
  delivery_minor: number;
  total_minor: number;
  status: PaymentRequestStatus;
  attempts: number;
  last_attempted_at: number | null;
  inventory_lock_expires_at: number | null;
  paid_at: number | null;
};
export type State = { threads: Thread[]; offers: Offer[]; requests: PaymentRequest[]; blocked: string[]; receipts: Record<string, string> };
export const emptyState: State = { threads: [], offers: [], requests: [], blocked: [], receipts: {} };
export type Context = { now: number; role: Role; listing: Pick<Listing, "id" | "seller_id" | "price_minor" | "qty" | "status" | "category_id"> };
export type Command =
  | { type: "offer"; id: string; amount_minor: number; qty: number; note: string; acknowledge?: boolean }
  | { type: "respond"; id: string; offer_id: string; event: Extract<OfferEvent, "accept" | "counter" | "decline" | "withdraw">; amount_minor?: number }
  | { type: "message"; id: string; body: string; photos: string[]; acknowledge?: boolean }
  | { type: "block"; id: string; blocked: boolean }
  | { type: "report"; id: string }
  | { type: "request"; id: string; offer_id: string; delivery_minor: number }
  | { type: "pay"; id: string; offer_id: string; outcome: "success" | "declined" | "timeout" };
const HOUR = 3600000;
const open = (o: Offer) => ["pending", "countered", "accepted"].includes(o.status);
export function expire(state: State, now: number): State {
  let changed = false;
  const offers = state.offers.map((o) => {
    if (!open(o) || o.expires_at > now) return o;
    changed = true;
    return { ...o, status: next(o.status, o.status === "accepted" ? "lapse" : "expire") };
  });
  const terminalOffers = new Set(offers.filter((o) => ["lapsed", "expired"].includes(o.status)).map((o) => o.id));
  const requests = state.requests.map((request) => {
    if (!terminalOffers.has(request.offer_id) || !canPayRequest(request.status, "expire")) return request;
    changed = true;
    return { ...request, status: nextPaymentRequest(request.status, "expire") };
  });
  return changed ? { ...state, offers, requests } : state;
}
/** Keep parse failures in the normal command-validation path, not React event errors. */
export function inputMinor(value: string) {
  try { return toMinor(Number(value)); } catch { return NaN; }
}
export function unsafeMessage(body: string) { return /(?:https?:\/\/|www\.|(?:\+?\d[\s()-]*){10,}|pay\s+me\s+directly|whats\s?app|bank\s+account)/i.test(body); }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function money(value: number) { assert(Number.isSafeInteger(value) && value >= 0, "Enter a valid amount in integer kobo."); }
function amount(value: number, price: number) {
  money(value);
  assert(value > 0 && value % rules.money.minorPerMajor === 0, "Enter a positive whole-naira amount.");
  assert(value >= Math.ceil(price * rules.offers.floorPercent / 100) && value <= price, `Offer must be between ${formatCurrency(kobo(Math.ceil(price * rules.offers.floorPercent / 100)))} and ${formatCurrency(kobo(price))}.`);
}
export function remainingStock(state: State, listing: Context["listing"]) {
  return Math.max(0, listing.qty - state.offers.filter((o) => o.listing_id === listing.id && o.status === "paid").reduce((n, o) => n + o.qty, 0));
}
// Compact non-security checksum for local replay detection. Images already live in
// messages; duplicating base64 in the receipt can double browser storage usage.
function photoSignature(photo: string) {
  let hash = 2166136261;
  for (let i = 0; i < photo.length; i++) hash = Math.imul(hash ^ photo.charCodeAt(i), 16777619);
  return `${photo.length}:${hash >>> 0}`;
}
export function offersLeft(state: State, listingId: string) { return Math.max(0, rules.offers.perListing - state.offers.filter((o) => o.listing_id === listingId).reduce((n, o) => n + o.attempts, 0)); }

/** In-browser mock repository boundary. Real auth, concurrency and funds belong in a
 * server adapter; these role checks describe the contract, not a security boundary. */
export function execute(previous: State, command: Command, ctx: Context): State {
  const receipt = `${ctx.role}:${ctx.listing.id}:${command.id}`;
  const signature = JSON.stringify(command.type === "message" ? { ...command, photos: command.photos.map(photoSignature) } : command);
  if (Object.hasOwn(previous.receipts, receipt)) {
    assert(previous.receipts[receipt] === signature, "This submission key was already used.");
    return expire(previous, ctx.now);
  }
  const state = structuredClone(expire(previous, ctx.now));
  const { listing, role, now } = ctx;
  assert(["live", "reserved", "sold", "paused", "ended"].includes(listing.status), "This listing is unavailable.");
  let thread = state.threads.find((t) => t.id === listing.id);
  if (command.type === "block") {
    assert(role === "buyer", "Only the buyer can change this block in the demo.");
    state.blocked = state.blocked.filter((id) => id !== listing.seller_id);
    if (command.blocked) state.blocked.push(listing.seller_id);
  } else {
    assert(!state.blocked.includes(listing.seller_id), "This seller is blocked. Unblock them to continue.");
    if (!thread) {
      assert(state.threads.filter((t) => t.created_at > now - 24 * HOUR).length < rules.messaging.newThreadsPerDay, "You've reached today's new conversation limit.");
      thread = { id: listing.id, seller_id: listing.seller_id, created_at: now, messages: [], reported: false };
      state.threads.push(thread);
    }
    const addMessage = (body: string, photos: string[] = [], flagged = false) => thread!.messages.push({ id: command.id, role, body, photos, at: now, flagged });
    const checkText = (body: string, acknowledged?: boolean) => {
      assert(body.length <= rules.messaging.maxChars, `Keep messages under ${rules.messaging.maxChars} characters.`);
      assert(!unsafeMessage(body) || acknowledged, "Keep payment and chat on WorldStore. Review the safety warning before sending.");
    };
    if (command.type === "report") {
      thread.reported = true;
      addMessage("Conversation flagged in this demo. No report has been sent to a moderation team.");
    } else if (command.type === "message") {
      const body = command.body.trim();
      assert(body || command.photos.length, "Write a message or attach a photo.");
      checkText(body, command.acknowledge);
      assert(command.photos.length <= rules.messaging.maxPhotos, `Attach up to ${rules.messaging.maxPhotos} photos.`);
      assert(command.photos.every((p) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length <= rules.messaging.photoMaxBytes * 1.4), "Choose a smaller PNG, JPEG or WebP photo.");
      addMessage(body, command.photos, unsafeMessage(body));
    } else if (command.type === "offer") {
      assert(role === "buyer", "Only the buyer can submit an offer.");
      assert(listing.status === "live", "This listing is not available for offers.");
      assert(!state.offers.some((o) => o.listing_id === listing.id && open(o)), "You already have an active offer on this listing.");
      assert(offersLeft(state, listing.id) > 0, "No offers left on this listing.");
      assert(state.offers.filter(open).length < rules.offers.maxOpen, "You have too many open offers. Finish one first.");
      amount(command.amount_minor, listing.price_minor);
      assert(Number.isSafeInteger(command.qty) && command.qty > 0 && command.qty <= remainingStock(state, listing), "Choose an available quantity.");
      money(command.amount_minor * command.qty);
      checkText(command.note, command.acknowledge);
      state.offers.push({ id: command.id, listing_id: listing.id, amount_minor: command.amount_minor, qty: command.qty, attempts: 1, status: "pending", expires_at: now + rules.offers.validityHours * HOUR });
      addMessage(`Offer: ${formatCurrency(kobo(command.amount_minor))} each × ${command.qty}.${command.note ? ` ${command.note}` : ""}`, [], unsafeMessage(command.note));
    } else {
      const offer = state.offers.find((o) => o.id === command.offer_id && o.listing_id === listing.id);
      assert(offer, "Offer not found.");
      if (command.type === "respond") {
        const expected = command.event === "withdraw" || offer.status === "countered" ? "buyer" : "seller";
        assert(role === expected, `Only the ${expected} can take this action.`);
        const target = next(offer.status, command.event);
        if (["accept", "counter"].includes(command.event)) {
          assert(listing.status === "live" && remainingStock(state, listing) >= offer.qty, "This quantity is no longer available.");
        }
        if (command.event === "counter") {
          assert(command.amount_minor !== undefined, "Enter a counter-offer.");
          amount(command.amount_minor, listing.price_minor);
          if (role === "buyer") {
            assert(offersLeft(state, listing.id) > 0, "No offers left on this listing.");
            offer.attempts += 1;
          }
          offer.amount_minor = command.amount_minor;
        }
        offer.status = target;
        offer.expires_at = now + (target === "accepted" ? rules.offers.payWindowHours : rules.offers.validityHours) * HOUR;
        addMessage(`Offer ${target}: ${formatCurrency(kobo(offer.amount_minor))} each × ${offer.qty}.`);
      } else {
        assert(offer.status === "accepted", "The deal must be accepted and within its payment deadline.");
        assert(listing.status === "live" && remainingStock(state, listing) >= offer.qty, "This quantity is no longer available.");
        assert(!["vehicles", "property"].includes(listing.category_id), "No escrow for this category.");
        if (command.type === "request") {
          assert(role === "seller", "Only the seller can send a payment request.");
          assert(!state.requests.some((r) => r.offer_id === offer.id), "A payment request already exists.");
          money(command.delivery_minor);
          const itemSubtotal = offer.amount_minor * offer.qty;
          const total = itemSubtotal + command.delivery_minor;
          money(total);
          state.requests.push({
            id: command.id,
            offer_id: offer.id,
            unit_minor: offer.amount_minor,
            qty: offer.qty,
            item_subtotal_minor: itemSubtotal,
            delivery_minor: command.delivery_minor,
            total_minor: total,
            status: "unpaid",
            attempts: 0,
            last_attempted_at: null,
            inventory_lock_expires_at: null,
            paid_at: null,
          });
          addMessage(`Payment requested: ${formatCurrency(kobo(total))}, including delivery. Demo only; no funds move.`);
        } else {
          assert(role === "buyer", "Only the buyer can pay a payment request.");
          const request = state.requests.find((r) => r.offer_id === offer.id);
          assert(request, "Wait for the seller's payment request.");
          assert(["unpaid", "declined", "timed_out"].includes(request.status), "This payment request can no longer be paid.");
          request.status = nextPaymentRequest(request.status, request.status === "unpaid" ? "start" : "retry");
          request.attempts += 1;
          request.last_attempted_at = now;
          request.inventory_lock_expires_at = now + rules.paymentRequest.lockMinutes * 60_000;
          const result: Record<typeof command.outcome, PaymentRequestEvent> = { success: "succeed", declined: "decline", timeout: "timeout" };
          request.status = nextPaymentRequest(request.status, result[command.outcome]);
          if (command.outcome === "success") {
            offer.status = next(offer.status, "pay");
            request.paid_at = now;
          }
          addMessage(command.outcome === "success" ? "Demo payment confirmed. Simulated escrow holds the agreed total; no funds moved." : `Demo payment ${command.outcome}. No money taken. You can retry before the deadline.`);
        }
      }
    }
  }
  state.receipts[receipt] = signature;
  return state;
}

// localStorage is untrusted and can contain data from older prototypes. Reject the
// whole snapshot on a shape mismatch rather than crashing the inbox during hydration.
export function parseState(raw: unknown): State {
  try {
    const source = raw as Omit<State, "requests"> & { requests: Array<Partial<PaymentRequest> & { offer_id: string; outcome?: "unpaid" | "success" | "declined" | "timeout" }> };
    const migratedRequests = source.requests?.map((request) => {
      if (request.status) return request;
      const offer = source.offers?.find((candidate) => candidate.id === request.offer_id);
      assert(offer, "legacy request offer");
      const status = request.outcome === "success" ? "paid" : request.outcome === "declined" ? "declined" : request.outcome === "timeout" ? "timed_out" : "unpaid";
      const itemSubtotal = offer.amount_minor * offer.qty;
      return {
        id: `legacy:${request.offer_id}`,
        offer_id: request.offer_id,
        unit_minor: offer.amount_minor,
        qty: offer.qty,
        item_subtotal_minor: itemSubtotal,
        delivery_minor: request.delivery_minor,
        total_minor: request.total_minor,
        status,
        attempts: status === "unpaid" ? 0 : 1,
        last_attempted_at: null,
        inventory_lock_expires_at: null,
        paid_at: null,
      };
    });
    const s = { ...source, requests: migratedRequests } as State;
    const str = (x: unknown) => typeof x === "string";
    const num = (x: unknown) => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
    assert(s && Array.isArray(s.threads) && Array.isArray(s.offers) && Array.isArray(s.requests) && Array.isArray(s.blocked), "state");
    assert(s.blocked.every(str) && s.receipts && typeof s.receipts === "object" && !Array.isArray(s.receipts) && Object.values(s.receipts).every(str), "receipts");
    assert(s.threads.every((t) => str(t.id) && str(t.seller_id) && num(t.created_at) && typeof t.reported === "boolean" && Array.isArray(t.messages) && t.messages.every((m) => str(m.id) && ["buyer", "seller"].includes(m.role) && str(m.body) && num(m.at) && typeof m.flagged === "boolean" && Array.isArray(m.photos) && m.photos.every(str))), "threads");
    assert(s.offers.every((o) => str(o.id) && str(o.listing_id) && num(o.amount_minor) && num(o.qty) && o.qty > 0 && num(o.attempts) && num(o.expires_at) && ["pending", "countered", "accepted", "paid", "lapsed", "withdrawn", "declined", "expired"].includes(o.status)), "offers");
    const nullableNum = (x: unknown) => x === null || num(x);
    assert(s.requests.every((r) => str(r.id) && str(r.offer_id) && num(r.unit_minor) && num(r.qty) && r.qty > 0 && num(r.item_subtotal_minor) && num(r.delivery_minor) && num(r.total_minor) && ["unpaid", "processing", "declined", "timed_out", "paid", "expired"].includes(r.status) && num(r.attempts) && nullableNum(r.last_attempted_at) && nullableNum(r.inventory_lock_expires_at) && nullableNum(r.paid_at)), "requests");
    return s;
  } catch { return emptyState; }
}
