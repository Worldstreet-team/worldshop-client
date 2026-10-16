import { rules } from "@ws/config/marketplace-rules";

/*
 * Money (R-002). Every amount is an integer number of kobo in NGN. There is no
 * currency field anywhere: one currency, no mixed lists (EC-028). Amounts reach the
 * screen only through formatCurrency().
 */

declare const koboBrand: unique symbol;
/** Integer kobo. Build one with toMinor() (from naira) or kobo() (already in kobo). */
export type Kobo = number & { readonly [koboBrand]: true };

const PER_NAIRA = rules.money.minorPerMajor;

/** Throws unless `value` is a safe integer, so fractional kobo never enters the system. */
export function assertKobo(value: number): asserts value is Kobo {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Expected integer kobo, got ${value}`);
  }
}

/** Tags an amount that is already integer kobo. */
export function kobo(value: number): Kobo {
  assertKobo(value);
  return value;
}

/** Rounds half away from zero, so −₦0.005 and ₦0.005 round symmetrically. */
function roundHalfAway(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value)) + 0;
}

/**
 * Naira → kobo, rounded to the nearest kobo (half away from zero). Shifts the decimal
 * point in the number's text so ₦1.005 becomes 101 kobo, not 100 (1.005 × 100 is
 * 100.49999… in floating point).
 */
export function toMinor(naira: number): Kobo {
  if (!Number.isFinite(naira)) throw new RangeError(`Expected a finite naira amount, got ${naira}`);
  const text = String(naira);
  const shifted = text.includes("e") ? naira * PER_NAIRA : Number(`${text}e2`);
  return kobo(roundHalfAway(shifted));
}

/** Kobo → naira, for inputs and analytics only. Never format this yourself. */
export function toMajor(minor: Kobo): number {
  return minor / PER_NAIRA;
}

export function sumMinor(...amounts: Kobo[]): Kobo {
  return kobo(amounts.reduce<number>((total, amount) => total + amount, 0));
}

/** A percentage of an amount (fees, offer floors), rounded to the nearest kobo. */
export function percentOf(minor: Kobo, percent: number): Kobo {
  return kobo(roundHalfAway((minor * percent) / 100));
}

/**
 * Whole-number discount for DiscountChip ("−23%"), or null when there is no real
 * reduction. Rounded down so the chip never overstates the saving.
 */
export function discountPercent(price: Kobo, was: Kobo | undefined): number | null {
  if (was === undefined || was <= 0 || price >= was) return null;
  const percent = Math.floor(((was - price) * 100) / was);
  return percent > 0 ? percent : null;
}

type FormatOptions = {
  /**
   * "auto" (default) shows kobo only when the amount has some, "always" forces
   * two decimals (receipts, ledgers), "never" rounds to whole naira (cards).
   */
  kobo?: "auto" | "always" | "never";
  /** Prefix positive amounts with "+" (delivery lines, ledger credits). */
  signed?: boolean;
};

const MINUS = "−";
const grouped = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** The only way an amount reaches the screen: "₦103,000", "₦1,250.50", "−₦3,000". */
export function formatCurrency(minor: Kobo, { kobo: koboMode = "auto", signed = false }: FormatOptions = {}): string {
  assertKobo(minor);
  const negative = minor < 0;
  const abs = Math.abs(minor);

  let naira = Math.floor(abs / PER_NAIRA);
  let fraction = abs % PER_NAIRA;
  if (koboMode === "never") {
    if (fraction * 2 >= PER_NAIRA) naira += 1;
    fraction = 0;
  }
  const showFraction = koboMode === "always" || (koboMode === "auto" && fraction > 0);
  const body = `₦${grouped.format(naira)}${showFraction ? `.${String(fraction).padStart(2, "0")}` : ""}`;

  if (negative && (naira > 0 || fraction > 0)) return `${MINUS}${body}`;
  if (signed && minor > 0) return `+${body}`;
  return body;
}
