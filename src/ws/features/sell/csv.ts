import { rules } from "@ws/config/marketplace-rules";
import { CONDITION_LABELS } from "@ws/lib/condition";
import type { CategoryId, Condition, DeliveryMethod } from "@ws/lib/data/types";
import { toMinor } from "@ws/lib/money";
import { DELIVERY_METHODS, newDraft, SELLABLE, SPECIFICS, type Draft, type ReturnDays, type SellerAccount, type SellerListing } from "./model";

/*
 * BulkImport (R-122) and CSV export (S3). Each valid row becomes a draft, never a live
 * listing: photos can't come from a CSV, and every draft still goes through the
 * wizard's publish checks. Invalid rows are reported with their row number and reasons,
 * and nothing is created for them.
 */

export const COLUMNS = ["title", "category", "condition", "price", "quantity", "description", "specifics", "delivery", "returns", "offers"] as const;
const PROHIBITED = /\b(guns?|pistols?|rifles?|firearms?|ammunition|ammo|cannabis|weed|codeine|tramadol|counterfeit|replicas?|fake)\b/i;

/** RFC 4180: commas, quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

const cell = (v: string | number) => {
  const s = String(v);
  // Quote when needed; a leading = + - @ is prefixed so spreadsheets don't run it as a formula.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};
export const toCsv = (rows: readonly (readonly (string | number)[])[]) => rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

export const TEMPLATE = toCsv([
  [...COLUMNS],
  ["iPhone 13 128GB Midnight", "phones", "used", 420000, 1, "Battery health 88%, light scratches on the back. Box and cable included.", "Brand=Apple; Model=iPhone 13; Storage=128GB", "rider; courier", 7, "yes"],
  ["Linen shirt, white, size M", "fashion", "new", 18000, 3, "Brand new 100% linen shirt, never worn, tags still on.", "Size=M; Colour=White", "pickup_station", "", "no"],
]);

/** Starts a browser download and keeps the object URL alive until the click is consumed. */
export function downloadCsv(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8" }));
  const anchor = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export type RowReport = { row: number; title: string; errors: string[]; draft_id: string | null };

const byName = (value: string) => value.trim().toLowerCase();
function category(value: string): CategoryId | null {
  const v = byName(value);
  return SELLABLE.find((id) => id === v) ?? null;
}
function condition(value: string): Condition | null {
  const v = byName(value).replace(/[\s-]+/g, "_");
  return (Object.keys(CONDITION_LABELS) as Condition[]).find((c) => c === v || byName(CONDITION_LABELS[c]).replace(/[\s-]+/g, "_") === v) ?? null;
}

/** Turns CSV rows into drafts. The header row is required and may list columns in any order. */
export function importCsv(account: SellerAccount, text: string, now: number, id: (n: number) => string): { account: SellerAccount; report: RowReport[] } {
  if (text.length > rules.bulkImport.maxBytes) throw new Error("This file is over 1 MB. Split it into smaller files.");
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const cols = (header ?? []).map(byName);
  const missing = COLUMNS.slice(0, 5).filter((c) => !cols.includes(c));
  if (missing.length) throw new Error(`The first row must name the columns. Missing: ${missing.join(", ")}. Download the template to start.`);
  if (!rows.length) throw new Error("No rows to import under the header.");
  if (rows.length > rules.bulkImport.maxRows) throw new Error(`Import up to ${rules.bulkImport.maxRows} rows at a time.`);
  const get = (r: string[], c: (typeof COLUMNS)[number]) => (cols.indexOf(c) >= 0 ? r[cols.indexOf(c)] ?? "" : "").trim();
  const drafts: Draft[] = [];
  const report = rows.map((r, i): RowReport => {
    const errors: string[] = [];
    const title = get(r, "title");
    if (title.length < 10 || title.length > rules.seller.titleMax) errors.push(`Title must be 10–${rules.seller.titleMax} characters.`);
    const cat = category(get(r, "category"));
    if (!cat) errors.push(`Category must be one of: ${SELLABLE.join(", ")}.`);
    const cond = condition(get(r, "condition"));
    if (!cond) errors.push("Condition must be new, like_new, refurbished, used or for_parts.");
    const priceText = get(r, "price").replace(/[₦,\s]/g, "");
    const price = /^\d+$/.test(priceText) ? toMinor(Number(priceText)) : null;
    if (price === null || price < toMinor(100)) errors.push("Price must be whole naira, at least 100.");
    const qtyText = get(r, "quantity");
    const qty = /^\d+$/.test(qtyText) ? Number(qtyText) : NaN;
    if (!(qty >= 1 && qty <= 999)) errors.push("Quantity must be 1 to 999.");
    const description = get(r, "description");
    if (description.length < 30 || description.length > rules.seller.descriptionMax) errors.push("Description must be at least 30 characters.");
    const banned = PROHIBITED.exec(`${title} ${description}`);
    if (banned) errors.push(`“${banned[0]}” isn’t allowed on WorldStore (prohibited items policy).`);
    const specifics: Record<string, string> = {};
    for (const pair of get(r, "specifics").split(";").map((p) => p.trim()).filter(Boolean)) {
      const [key, ...rest] = pair.split("=");
      const known = cat ? SPECIFICS[cat].find((s) => s.key.toLowerCase() === key.trim().toLowerCase()) : undefined;
      if (!known || !rest.join("=").trim()) errors.push(`Unknown item specific “${pair}”. Use Key=Value with this category’s keys.`);
      else specifics[known.key] = rest.join("=").trim().slice(0, 80);
    }
    const methods = get(r, "delivery") ? get(r, "delivery").split(";").map(byName).filter(Boolean) : ["rider"];
    const badMethod = methods.find((m) => !(m in DELIVERY_METHODS));
    if (badMethod) errors.push(`Delivery “${badMethod}” must be rider, pickup_station, meet_up or courier.`);
    const returnsText = get(r, "returns");
    const returns = returnsText === "" || byName(returnsText) === "none" ? null : Number(returnsText);
    if (returns !== null && ![3, 7, 14].includes(returns)) errors.push("Returns must be 3, 7, 14 or none.");
    const offersText = byName(get(r, "offers"));
    if (offersText && !["yes", "no"].includes(offersText)) errors.push("Offers must be yes or no.");
    if (errors.length || !cat || !cond || price === null) return { row: i + 2, title, errors, draft_id: null };
    const draftId = id(i);
    drafts.push({
      ...newDraft(draftId, now), category_id: cat, condition: cond, title, description, price_minor: price, qty, specifics,
      offers_enabled: offersText !== "no", return_days: returns as ReturnDays,
      delivery: (methods as DeliveryMethod[]).map((m) => ({ method: m, fee_minor: DELIVERY_METHODS[m].fee_minor, handling_days: 1 })),
      step: 1, max_step: 7,
    });
    return { row: i + 2, title, errors: [], draft_id: draftId };
  });
  return { account: { ...account, drafts: [...account.drafts, ...drafts] }, report };
}

/** S3 "export CSV": the seller's listings in the import format, plus status and id. */
export function exportCsv(listings: readonly SellerListing[]) {
  return toCsv([
    ["id", "status", ...COLUMNS],
    ...listings.map((l) => [l.id, l.status, l.title, l.category_id, l.condition, (l.price_minor ?? 0) / 100, l.qty, l.description, Object.entries(l.specifics).map(([k, v]) => `${k}=${v}`).join("; "), l.delivery.map((d) => d.method).join("; "), l.return_days ?? "none", l.offers_enabled ? "yes" : "no"]),
  ]);
}
