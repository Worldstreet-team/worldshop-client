import { HammerIcon, HandshakeAgreementDealIcon } from "@ws/components/icons";
import { Chip, type ChipTone } from "@ws/components/ui";
import type { Condition, ListingFormat } from "@ws/lib/data/types";
import { CONDITION_LABELS } from "@ws/lib/condition";
import { timeLeft } from "@ws/lib/format";

/* ConditionChip and FormatChip (spec §5.3) on the DS Chip. Condition names are eBay's,
   in the DS's sentence case. */

const CONDITION: Record<Condition, { label: string; tone: ChipTone }> = {
  new: { label: CONDITION_LABELS.new, tone: "neutral" },
  like_new: { label: CONDITION_LABELS.like_new, tone: "neutral" },
  refurbished: { label: CONDITION_LABELS.refurbished, tone: "neutral" },
  used: { label: CONDITION_LABELS.used, tone: "neutral" },
  for_parts: { label: CONDITION_LABELS.for_parts, tone: "warning" },
};

/** Empty when the seller gave no condition (the live API allows that). */
export function conditionLabel(condition: Condition | undefined) {
  return condition ? CONDITION[condition].label : "";
}

/** `certified` marks a refurbishment programme item: gold "Certified refurbished". */
export function ConditionChip({ condition, certified }: { condition: Condition; certified?: boolean }) {
  if (condition === "refurbished" && certified) return <Chip tone="brand">Certified refurbished</Chip>;
  const { label, tone } = CONDITION[condition];
  return <Chip tone={tone}>{label}</Chip>;
}

type FormatChipProps = {
  format: ListingFormat;
  /** Auctions only: when bidding closes (UTC ISO). */
  endsAt?: string;
  now?: number;
};

/** "Buy now", "Best offer" or "Auction · 2d 4h". Buy now is the default, so cards may omit it. */
export function FormatChip({ format, endsAt, now }: FormatChipProps) {
  if (format === "best_offer") {
    return (
      <Chip className="ws-chip-icon">
        <HandshakeAgreementDealIcon />
        Best offer
      </Chip>
    );
  }
  if (format === "auction") {
    const left = endsAt ? timeLeft(endsAt, now) : null;
    return (
      <Chip className="ws-chip-icon" tone={left ? "neutral" : "warning"}>
        <HammerIcon />
        {left ? `Auction · ${left}` : "Auction ended"}
      </Chip>
    );
  }
  return <Chip>Buy now</Chip>;
}
