import { rules } from "@ws/config/marketplace-rules";
import { AREAS } from "@ws/lib/areas";
import type { Category, CategoryId, Condition, DeliveryMethod, DeliveryOption, ListingWithSeller, SellerProfile } from "@ws/lib/data/types";
import { slugify } from "@ws/lib/format";
import { sellerFees } from "@ws/lib/ledger";
import { kobo, toMinor } from "@ws/lib/money";
import { validOrder, validWithdrawal, type SellerOrder, type Withdrawal } from "./hub";

/*
 * Seller onboarding and listing creation (flows S1, S2), as a device-local demo like
 * orders and negotiations: the account, KYC result, payout account, drafts and
 * published listings live in this browser. Pure functions; store.ts persists them.
 * KYC and bank name enquiry are mocked: nothing is sent to an identity or bank provider.
 */

const DAY = 86_400_000;

export type KycStatus = "not_started" | "in_review" | "approved" | "rejected" | "needs_more_info"; // R-101
export type IdType = "nin" | "passport" | "drivers";
export const ID_TYPES: Record<IdType, { label: string; pattern: RegExp; hint: string }> = {
  nin: { label: "NIN (National Identification Number)", pattern: /^\d{11}$/, hint: "11 digits" },
  passport: { label: "International passport", pattern: /^[A-Z]\d{8}$/, hint: "A letter then 8 digits, e.g. A12345678" },
  drivers: { label: "Driver’s licence", pattern: /^[A-Z0-9]{12}$/, hint: "12 letters and digits" },
};
export const BANKS = ["Access Bank", "First Bank", "GTBank", "Kuda", "Moniepoint", "Opay", "Palmpay", "Stanbic IBTC", "UBA", "Wema Bank", "Zenith Bank"] as const;

export type Profile = { shop_name: string; handle: string; bio: string; area_id: string; categories: CategoryId[] };
/** Only the last 4 characters of the ID number are kept (NDPA, flows K10). */
export type Kyc = { status: KycStatus; id_type: IdType | null; id_last4: string; legal_name: string; reason: string; submissions: number[] };
export type Payout = { kind: "bank"; bank: string; account_last4: string; account_name: string } | { kind: "wallet" };

export type Photo = { url: string; width: number; height: number; bytes: number };
export type DeliveryChoice = { method: DeliveryMethod; fee_minor: number; handling_days: 0 | 1 | 2 | 3 };
export type ReturnDays = 3 | 7 | 14 | null;
export type ListingFields = {
  photos: Photo[];
  category_id: CategoryId | "";
  specifics: Record<string, string>;
  condition: Condition | "";
  flaws: string;
  serial: string;
  title: string;
  description: string;
  price_minor: number | null;
  qty: number;
  offers_enabled: boolean;
  auto_accept_minor: number | null;
  auto_decline_minor: number | null;
  delivery: DeliveryChoice[];
  package: "small" | "medium" | "large";
  return_days: ReturnDays;
  return_payer: "buyer" | "seller";
};
export type Draft = ListingFields & { id: string; created_at: number; updated_at: number; step: number; max_step: number; /** A moderator asked for changes (A1). */ admin_note?: string };
/** "paused" = out of stock (R-121), "ended" = ended by the seller (R-120), "removed" = by moderation (A1). */
export type ListingState = "live" | "in_review" | "paused" | "ended" | "removed";
/** One logged edit to a live listing (R-112). */
export type Revision = { at: number; field: "price" | "qty"; from: number; to: number };
/** Promoted listing (S3): the ad rate is charged at release, only if it sells while promoted. */
export type Promotion = { rate_percent: number; since: number };
export type SellerListing = ListingFields & { id: string; created_at: number; published_at: number; updated_at: number; status: ListingState; review_reason: string; revisions: Revision[]; promotion: Promotion | null };
export type SellerAccount = { profile: Profile | null; kyc: Kyc; payout: Payout | null; agreed_at: number | null; drafts: Draft[]; listings: SellerListing[]; orders: SellerOrder[]; withdrawals: Withdrawal[]; withdraw_hold_until: number | null; /** Set by Trust & Safety (A1, A3). */ suspended_reason: string | null; payout_hold_reason: string | null };

export const initialAccount: SellerAccount = {
  profile: null,
  kyc: { status: "not_started", id_type: null, id_last4: "", legal_name: "", reason: "", submissions: [] },
  payout: null,
  agreed_at: null,
  drafts: [],
  listings: [],
  orders: [],
  withdrawals: [],
  withdraw_hold_until: null,
  suspended_reason: null,
  payout_hold_reason: null,
};

export const STEPS = ["Photos", "Details", "Title", "Price", "Delivery", "Returns", "Review"] as const;

/** Goods only for now: vehicles and property list with viewings, not delivery and escrow (PLAN risk 7). */
export const SELLABLE: readonly CategoryId[] = ["phones", "electronics", "computing", "fashion", "home", "appliances", "furniture", "beauty"];

/** Item specifics by category (S2 step 2), keyed like the listing attributes buyers filter on. */
export const SPECIFICS: Record<CategoryId, readonly { key: string; required: boolean; options?: readonly string[] }[]> = {
  phones: [{ key: "Brand", required: true, options: ["Apple", "Samsung", "Tecno", "Infinix", "Itel", "Google", "Xiaomi", "Nokia"] }, { key: "Model", required: true }, { key: "Storage", required: true, options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] }, { key: "Battery health", required: false }],
  electronics: [{ key: "Brand", required: true }, { key: "Model", required: false }, { key: "Colour", required: false }],
  computing: [{ key: "Brand", required: true, options: ["Apple", "HP", "Dell", "Lenovo", "Asus", "Acer", "Microsoft"] }, { key: "Model", required: true }, { key: "RAM", required: true, options: ["4GB", "8GB", "16GB", "32GB", "64GB"] }, { key: "Storage", required: true, options: ["128GB", "256GB", "512GB", "1TB", "2TB"] }],
  fashion: [{ key: "Size", required: true }, { key: "Colour", required: false }, { key: "Material", required: false }, { key: "Brand", required: false }],
  home: [{ key: "Brand", required: false }, { key: "Capacity", required: false }, { key: "Colour", required: false }],
  appliances: [{ key: "Brand", required: true }, { key: "Capacity", required: false }, { key: "Power", required: false }],
  furniture: [{ key: "Seats", required: false }, { key: "Colour", required: false }, { key: "Material", required: false }],
  beauty: [{ key: "Brand", required: true }, { key: "Size", required: false }],
  vehicles: [],
  property: [],
};

export const DELIVERY_METHODS: Record<DeliveryMethod, { label: string; coverage: DeliveryOption["coverage"]; transit: readonly [number, number]; fee_minor: number }> = {
  rider: { label: "Rider delivery", coverage: "same_city", transit: [0, 1], fee_minor: toMinor(2_500) },
  pickup_station: { label: "Pickup station", coverage: "nationwide", transit: [1, 3], fee_minor: toMinor(1_500) },
  meet_up: { label: "Meet-up / local pickup", coverage: "same_city", transit: [0, 0], fee_minor: 0 },
  courier: { label: "Nationwide courier", coverage: "nationwide", transit: [2, 4], fee_minor: toMinor(4_500) },
};

export const QUIZ = [
  { q: "A buyer asks you to sell them a pistol. What do you do?", options: ["List it in Electronics", "Decline: weapons can’t be sold on WorldStore", "Sell it outside the app"], answer: 1, why: "Weapons, drugs and counterfeit goods are prohibited." },
  { q: "A buyer offers to pay you by bank transfer outside WorldStore. What do you do?", options: ["Accept to save fees", "Send a payment request in chat instead", "Share your account number"], answer: 1, why: "Only payments through WorldStore are held in escrow and protected." },
  { q: "An item arrives broken and the buyer reports it within the inspection window. What happens?", options: ["The buyer has no protection if you said “no returns”", "You must accept the return or refund", "You keep the money"], answer: 1, why: "Not-as-described protection applies even with a “no returns” policy." },
] as const;

const PROHIBITED = /\b(guns?|pistols?|rifles?|firearms?|ammunition|ammo|cannabis|weed|codeine|tramadol|counterfeit|replicas?|fake)\b/i; // R-110
const AUTHENTICATE = /\b(rolex|louis vuitton|gucci|cartier|chanel|herm[eè]s|prada|dior)\b/i; // R-111: luxury goes to review

function fail(message: string): never { throw new Error(message); }
const isTime = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;

export function newDraft(id: string, now: number): Draft {
  return { id, created_at: now, updated_at: now, step: 1, max_step: 1, photos: [], category_id: "", specifics: {}, condition: "", flaws: "", serial: "", title: "", description: "", price_minor: null, qty: 1, offers_enabled: true, auto_accept_minor: null, auto_decline_minor: null, delivery: [{ method: "rider", fee_minor: DELIVERY_METHODS.rider.fee_minor, handling_days: 1 }], package: "small", return_days: 7, return_payer: "buyer" };
}

/* ---------- S1: profile, KYC, payout, agreement ---------- */

export function saveProfile(account: SellerAccount, profile: Profile, taken: readonly string[]): SellerAccount {
  const handle = profile.handle.trim().toLowerCase();
  if (profile.shop_name.trim().length < 3) fail("Enter a shop name of at least 3 characters.");
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) fail("Use 3–20 lower-case letters, numbers or underscores for your handle.");
  if (taken.includes(handle)) fail(`@${handle} is taken. Try another handle.`);
  if (!AREAS.some((area) => area.id === profile.area_id)) fail("Choose your area.");
  if (!profile.categories.length) fail("Choose at least one category you sell.");
  return { ...account, profile: { ...profile, shop_name: profile.shop_name.trim(), handle, bio: profile.bio.trim().slice(0, 160) } };
}

export function submitKyc(account: SellerAccount, input: { id_type: IdType; id_number: string; legal_name: string; selfie: boolean }, now: number): SellerAccount {
  if (!["not_started", "rejected", "needs_more_info"].includes(account.kyc.status)) fail("Your identity check is already submitted.");
  const id = input.id_number.replace(/\s/g, "").toUpperCase();
  const type = ID_TYPES[input.id_type] ?? fail("Choose an ID type.");
  if (!type.pattern.test(id)) fail(`Check your ID number: ${type.hint}.`);
  const name = input.legal_name.trim().replace(/\s+/g, " ");
  if (name.split(" ").length < 2) fail("Enter your first and last name exactly as on your ID.");
  if (!input.selfie) fail("Take the selfie check so we can match you to your ID.");
  const recent = account.kyc.submissions.filter((at) => now - at < DAY);
  if (recent.length >= 3) fail("You’ve tried 3 times in 24 hours. Try again tomorrow, or contact support."); // R-102
  return { ...account, kyc: { status: "in_review", id_type: input.id_type, id_last4: id.slice(-4), legal_name: name, reason: "", submissions: [...recent, now] } };
}

export const KYC_REASONS = {
  rejected: "The name you entered doesn’t match your ID. Enter it exactly as printed on the ID, then resubmit.",
  needs_more_info: "Your selfie was too dark to match. Retake it facing a window, without glasses or a cap.",
} as const;

/** Demo stand-in for the identity provider's result (R-101). */
export function resolveKyc(account: SellerAccount, result: "approved" | keyof typeof KYC_REASONS): SellerAccount {
  if (account.kyc.status !== "in_review") fail("There is no identity check in review.");
  return { ...account, kyc: { ...account.kyc, status: result, reason: result === "approved" ? "" : KYC_REASONS[result] } };
}

/** Mock NIBSS name enquiry: account numbers starting 999 belong to someone else, to show the mismatch path. */
export function nameEnquiry(accountNumber: string, legalName: string) {
  if (!/^\d{10}$/.test(accountNumber)) fail("Enter your 10-digit account number.");
  return accountNumber.startsWith("999") ? "ADEBAYO TRADING VENTURES" : legalName.toUpperCase();
}

export const namesMatch = (a: string, b: string) => {
  const words = (name: string) => name.toLowerCase().split(/[^\p{Letter}]+/u).filter(Boolean).sort().join(" ");
  return words(a) !== "" && words(a) === words(b);
};

export function savePayout(account: SellerAccount, payout: Payout, now: number): SellerAccount {
  if (payout.kind === "bank") {
    if (!BANKS.includes(payout.bank as (typeof BANKS)[number])) fail("Choose your bank.");
    if (!account.kyc.legal_name) fail("Verify your identity before adding a bank account.");
    if (!namesMatch(payout.account_name, account.kyc.legal_name)) fail(`Account name must match your ID name. This account belongs to ${payout.account_name}.`);
  }
  // R-270: changing an existing bank account holds withdrawals for 24 hours.
  const changed = account.payout?.kind === "bank" && (payout.kind !== "bank" || payout.account_last4 !== account.payout.account_last4 || payout.bank !== account.payout.bank);
  return { ...account, payout, withdraw_hold_until: changed ? now + DAY : account.withdraw_hold_until };
}

export function agree(account: SellerAccount, answers: readonly number[], now: number): SellerAccount {
  const wrong = QUIZ.findIndex((item, index) => answers[index] !== item.answer);
  if (wrong >= 0) fail(`Question ${wrong + 1}: ${QUIZ[wrong].why}`);
  return { ...account, agreed_at: now };
}

/** R-100: drafts are allowed before KYC; publishing needs L2, a payout account and the agreement. */
export function canPublish(account: SellerAccount) {
  return account.profile !== null && account.suspended_reason === null && account.kyc.status === "approved" && account.payout !== null && account.agreed_at !== null;
}

/* ---------- S2: listing validation ---------- */

export type Issue = { step: number; field: string; message: string; block: boolean };
export type Guidance = { low_minor: number; median_minor: number; high_minor: number; count: number };

/** Comparable live prices per category for the price guidance panel (S2 step 4). */
export function priceGuidance(prices: readonly { category_id: CategoryId; price_minor: number }[]) {
  const out: Partial<Record<CategoryId, Guidance>> = {};
  for (const id of SELLABLE) {
    const sorted = prices.filter((p) => p.category_id === id).map((p) => p.price_minor).sort((a, b) => a - b);
    if (sorted.length < 3) continue;
    const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1) + 0.5))];
    out[id] = { low_minor: at(0.1), median_minor: at(0.5), high_minor: at(0.9), count: sorted.length };
  }
  return out;
}

/** IMEI: 15 digits with a Luhn check digit (R-111). */
export function validImei(value: string) {
  if (!/^\d{15}$/.test(value)) return false;
  const sum = [...value].reverse().reduce((total, char, index) => { let d = Number(char); if (index % 2) { d *= 2; if (d > 9) d -= 9; } return total + d; }, 0);
  return sum % 10 === 0;
}

const normalTitle = (title: string) => title.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();

export function listingIssues(draft: ListingFields & { id: string }, account: SellerAccount, guidance: Partial<Record<CategoryId, Guidance>>, now: number): Issue[] {
  const issues: Issue[] = [];
  const add = (step: number, field: string, message: string, block = true) => issues.push({ step, field, message, block });
  if (!draft.photos.length) add(1, "photos", "Add at least one photo.");
  else if (draft.photos.length < 4) add(1, "photos", "Listings with 4 or more photos (front, back, any damage) get more offers.", false);

  if (!draft.category_id) add(2, "category", "Choose a category.");
  else {
    for (const spec of SPECIFICS[draft.category_id]) if (spec.required && !draft.specifics[spec.key]?.trim()) add(2, `spec:${spec.key}`, `Enter the ${spec.key.toLowerCase()}.`);
    if (draft.category_id === "phones" && !validImei(draft.serial)) add(2, "serial", "Enter the phone’s 15-digit IMEI (dial *#06#). We check it against stolen-phone lists.");
    if (draft.category_id === "computing" && !/^[A-Za-z0-9]{6,20}$/.test(draft.serial)) add(2, "serial", "Enter the serial number (6–20 letters and digits, on the label or in Settings › About).");
  }
  if (!draft.condition) add(2, "condition", "Choose the condition.");
  if ((draft.condition === "used" || draft.condition === "for_parts") && draft.flaws.trim().length < 10) add(2, "flaws", "Describe any wear, damage or faults (at least 10 characters).");

  const title = draft.title.trim();
  if (title.length < 10) add(3, "title", "Write a title of at least 10 characters: brand, model and key feature.");
  if (title.length > rules.seller.titleMax) add(3, "title", `Keep the title to ${rules.seller.titleMax} characters.`);
  if (/[A-Z]{4,}/.test(title) && title === title.toUpperCase()) add(3, "title", "Avoid ALL CAPS: buyers find sentence case easier to read.", false);
  const desc = draft.description.trim();
  if (desc.length < 30) add(3, "description", "Describe the item in at least 30 characters: what’s included and why you’re selling.");
  if (desc.length > rules.seller.descriptionMax) add(3, "description", `Keep the description to ${rules.seller.descriptionMax.toLocaleString("en-NG")} characters.`);
  const banned = PROHIBITED.exec(`${title} ${desc}`);
  if (banned) add(3, "title", `“${banned[0]}” isn’t allowed on WorldStore (prohibited items policy).`);
  const twin = account.listings.find((item) => item.id !== draft.id && now - item.published_at < DAY && normalTitle(item.title) === normalTitle(title));
  if (title && twin) add(3, "title", "You listed an item with this title in the last 24 hours. Edit that listing’s quantity instead."); // R-113

  const price = draft.price_minor;
  if (price === null || !Number.isSafeInteger(price) || price < toMinor(100)) add(4, "price", "Enter a price of at least ₦100.");
  if (!Number.isSafeInteger(draft.qty) || draft.qty < 1 || draft.qty > 999) add(4, "qty", "Enter a quantity from 1 to 999.");
  if (price !== null && draft.offers_enabled) {
    const { auto_accept_minor: accept, auto_decline_minor: decline } = draft;
    if (accept !== null && (accept > price || accept <= 0)) add(4, "auto_accept", "Auto-accept must be at or below your price.");
    if (decline !== null && (decline >= price || decline <= 0)) add(4, "auto_decline", "Auto-decline must be below your price.");
    if (accept !== null && decline !== null && decline >= accept) add(4, "auto_decline", "Auto-decline must be below auto-accept.");
  }
  const guide = draft.category_id ? guidance[draft.category_id] : undefined;
  if (price !== null && guide) {
    if (price > guide.median_minor * (1 + rules.seller.priceWarnAbovePercent / 100)) add(4, "price", `This is over ${rules.seller.priceWarnAbovePercent}% above similar listings. It may take longer to sell.`, false);
    if (price < guide.median_minor * rules.seller.priceWarnBelowPercentOfMedian / 100) add(4, "price", "This is far below similar listings. Check the price; buyers may doubt it.", false); // EC-027
  }

  if (!draft.delivery.length) add(5, "delivery", "Choose at least one way to get the item to the buyer.");
  if (draft.delivery.some((d) => !Number.isSafeInteger(d.fee_minor) || d.fee_minor < 0)) add(5, "delivery", "Delivery fees must be whole naira, ₦0 or more.");

  if (account.suspended_reason) add(7, "kyc", `Your shop is suspended: ${account.suspended_reason} Your draft is saved; contact support to appeal.`);
  else if (!canPublish(account)) add(7, "kyc", "Verify your identity and add a payout account to publish. Your draft is saved.");
  return issues;
}

export const blocking = (issues: readonly Issue[]) => issues.filter((issue) => issue.block);

export function publish(account: SellerAccount, draftId: string, guidance: Partial<Record<CategoryId, Guidance>>, now: number): SellerAccount {
  const draft = account.drafts.find((item) => item.id === draftId) ?? fail("This draft no longer exists.");
  const blocked = blocking(listingIssues(draft, account, guidance, now));
  if (blocked.length) fail(blocked[0].message);
  const flagged = AUTHENTICATE.exec(`${draft.title} ${draft.description}`);
  const fields: ListingFields = { photos: draft.photos, category_id: draft.category_id, specifics: draft.specifics, condition: draft.condition, flaws: draft.flaws, serial: draft.serial, title: draft.title.trim(), description: draft.description.trim(), price_minor: draft.price_minor, qty: draft.qty, offers_enabled: draft.offers_enabled, auto_accept_minor: draft.offers_enabled ? draft.auto_accept_minor : null, auto_decline_minor: draft.offers_enabled ? draft.auto_decline_minor : null, delivery: draft.delivery, package: draft.package, return_days: draft.return_days, return_payer: draft.return_payer };
  const listing: SellerListing = { ...fields, id: draft.id, created_at: draft.created_at, published_at: now, updated_at: now, revisions: [], promotion: null, status: flagged ? "in_review" : "live", review_reason: flagged ? `${flagged[0]} items get an authenticity check before going live, usually within 24 hours.` : "" };
  return { ...account, drafts: account.drafts.filter((item) => item.id !== draftId), listings: [listing, ...account.listings.filter((item) => item.id !== draftId)] };
}

/** What the seller keeps if it sells at the list price, before delivery (S2 step 7). Same maths as the ledger. */
export function feePreview(priceMinor: number) {
  const fees = sellerFees(priceMinor, 0);
  return { ...fees, receive_minor: priceMinor - fees.total_minor };
}

/** The draft as a buyer's card would show it (ListingLivePreview). */
export function toPreview(draft: ListingFields & { id: string; created_at: number }, account: SellerAccount, category: Category, now: number): ListingWithSeller {
  const area = AREAS.find((item) => item.id === account.profile?.area_id) ?? AREAS[0];
  const place = { lat: area.lat, lng: area.lng, area: area.label, city: area.city, state: area.city };
  const seller: SellerProfile = { id: "me", handle: account.profile?.handle ?? "yourshop", shop_name: account.profile?.shop_name ?? "Your shop", area: place, level: "new", verified: account.kyc.status === "approved", top_rated: false, feedback: { positive_percent: 0, count: 0 }, joined_at: new Date(now).toISOString(), show_watchers: false };
  const title = draft.title.trim() || "Your title appears here";
  return {
    id: draft.id, slug: slugify(title), seller_id: "me", category_id: category.id, title, description: draft.description, condition: draft.condition || "used",
    price_minor: kobo(draft.price_minor ?? 0), qty: draft.qty, format: draft.offers_enabled ? "best_offer" : "buy_now", offers_enabled: draft.offers_enabled,
    location: place, return_days: draft.return_days, status: "live", created_at: new Date(draft.created_at).toISOString(), seller, category,
    delivery: draft.delivery.map((d) => { const m = DELIVERY_METHODS[d.method]; return { method: d.method, fee_minor: kobo(d.fee_minor), coverage: m.coverage, eta_days: [m.transit[0] + d.handling_days, m.transit[1] + d.handling_days] as const }; }),
    media: draft.photos.map((p, i) => ({ url: p.url, alt: `${title}, photo ${i + 1}`, order: i, type: "image" as const, width: p.width, height: p.height })),
    attributes: Object.entries(draft.specifics).filter(([, v]) => v.trim()).map(([key, value]) => ({ key, value })),
  };
}

/* ---------- persisted state ---------- */

const isText = (v: unknown, max = 10_000) => typeof v === "string" && v.length <= max;
const isMoney = (v: unknown) => v === null || (Number.isSafeInteger(v) && (v as number) >= 0);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const CONDITIONS = ["", "new", "like_new", "refurbished", "used", "for_parts"];
const METHODS = Object.keys(DELIVERY_METHODS);

function validFields(f: Record<string, unknown>) {
  return Array.isArray(f.photos) && f.photos.length <= rules.seller.photosMax && f.photos.every((p) => isRecord(p) && isText(p.url, 2_000_000) && /^data:image\/(jpeg|png|webp);base64,/.test(p.url as string) && Number.isSafeInteger(p.width) && Number.isSafeInteger(p.height) && Number.isSafeInteger(p.bytes))
    && (f.category_id === "" || SELLABLE.includes(f.category_id as CategoryId))
    && isRecord(f.specifics) && Object.values(f.specifics).every((v) => isText(v, 80))
    && CONDITIONS.includes(f.condition as string) && isText(f.flaws, 1_000) && isText(f.serial, 40) && isText(f.title, 200) && isText(f.description, rules.seller.descriptionMax + 1_000)
    && isMoney(f.price_minor) && Number.isSafeInteger(f.qty) && typeof f.offers_enabled === "boolean" && isMoney(f.auto_accept_minor) && isMoney(f.auto_decline_minor)
    && Array.isArray(f.delivery) && f.delivery.every((d) => isRecord(d) && METHODS.includes(d.method as string) && isMoney(d.fee_minor) && d.fee_minor !== null && [0, 1, 2, 3].includes(d.handling_days as number))
    && ["small", "medium", "large"].includes(f.package as string) && [3, 7, 14, null].includes(f.return_days as ReturnDays) && ["buyer", "seller"].includes(f.return_payer as string);
}

export function parseAccount(raw: unknown): SellerAccount {
  if (!isRecord(raw) || !isRecord(raw.kyc) || !Array.isArray(raw.drafts) || !Array.isArray(raw.listings)) throw new Error("Invalid seller account");
  const { profile, kyc, payout } = raw;
  const okProfile = profile === null || (isRecord(profile) && isText(profile.shop_name, 80) && isText(profile.handle, 20) && isText(profile.bio, 160) && AREAS.some((a) => a.id === profile.area_id) && Array.isArray(profile.categories) && profile.categories.every((c) => SELLABLE.includes(c as CategoryId)));
  const okKyc = ["not_started", "in_review", "approved", "rejected", "needs_more_info"].includes(kyc.status as string) && (kyc.id_type === null || kyc.id_type as string in ID_TYPES) && isText(kyc.id_last4, 4) && isText(kyc.legal_name, 120) && isText(kyc.reason, 400) && Array.isArray(kyc.submissions) && kyc.submissions.every(isTime);
  const okPayout = payout === null || (isRecord(payout) && (payout.kind === "wallet" || (payout.kind === "bank" && isText(payout.bank, 40) && isText(payout.account_last4, 4) && isText(payout.account_name, 120))));
  const okDrafts = raw.drafts.every((d) => isRecord(d) && (d.admin_note === undefined || isText(d.admin_note, 600)) && isText(d.id, 40) && isTime(d.created_at) && isTime(d.updated_at) && Number.isSafeInteger(d.step) && Number.isSafeInteger(d.max_step) && validFields(d));
  // Accounts saved before Phase 7b lack these fields; they start empty.
  for (const l of raw.listings) if (isRecord(l)) { l.updated_at ??= l.published_at; l.revisions ??= []; l.promotion ??= null; }
  for (const o of Array.isArray(raw.orders) ? raw.orders : []) if (isRecord(o)) o.promotion_rate ??= null;
  raw.orders ??= []; raw.withdrawals ??= []; raw.withdraw_hold_until ??= null; raw.suspended_reason ??= null; raw.payout_hold_reason ??= null;
  const okListings = raw.listings.every((l) => isRecord(l) && isText(l.id, 40) && isTime(l.created_at) && isTime(l.published_at) && isTime(l.updated_at) && ["live", "in_review", "paused", "ended", "removed"].includes(l.status as string) && isText(l.review_reason, 400) && validFields(l)
    && (l.promotion === null || (isRecord(l.promotion) && Number.isSafeInteger(l.promotion.rate_percent) && isTime(l.promotion.since))) && Array.isArray(l.revisions) && l.revisions.every((r) => isRecord(r) && isTime(r.at) && (r.field === "price" || r.field === "qty") && Number.isSafeInteger(r.from) && Number.isSafeInteger(r.to)));
  const okOrders = Array.isArray(raw.orders) && raw.orders.every(validOrder) && Array.isArray(raw.withdrawals) && raw.withdrawals.every(validWithdrawal) && (raw.withdraw_hold_until === null || isTime(raw.withdraw_hold_until)) && (raw.suspended_reason === null || isText(raw.suspended_reason, 400)) && (raw.payout_hold_reason === null || isText(raw.payout_hold_reason, 400));
  if (!okProfile || !okKyc || !okPayout || !okDrafts || !okListings || !okOrders || !(raw.agreed_at === null || isTime(raw.agreed_at))) throw new Error("Invalid seller account");
  return raw as SellerAccount;
}
