import { StarIcon } from "@ws/components/icons";
import { cx } from "@ws/lib/cx";
import { formatCount, plural } from "@ws/lib/format";

/* RatingStars, read-only (spec §5.3). eBay shows "★★★★½ (52)". Item and seller ratings
   are named differently so they're never confused (audit F13): the accessible name
   says which one it is. Renders nothing without real ratings (PLAN F7). */

type Props = {
  value: number;
  count: number;
  kind?: "item" | "seller";
  size?: "md" | "lg";
  /** Hide "(52)" where the count is shown elsewhere. */
  hideCount?: boolean;
};

const STARS = [0, 1, 2, 3, 4];

export function RatingStars({ value, count, kind = "item", size = "md", hideCount }: Props) {
  if (!(count > 0) || !Number.isFinite(value)) return null;
  const rating = Math.min(5, Math.max(0, Math.round(value * 10) / 10));
  const full = Math.floor(rating);
  const part = rating - full;
  const label = `${kind === "item" ? "Item" : "Seller"} rating ${rating} out of 5, ${plural(count, "rating")}`;

  return (
    <span role="img" aria-label={label} className={cx("ws-stars", size === "lg" && "ws-stars--lg")}>
      <span className="ws-stars__track">
        {STARS.map((i) => (
          <StarIcon key={i} />
        ))}
        <span className="ws-stars__fill" style={{ width: `calc(${full} * (var(--ws-star) + var(--ws-star-gap)) + ${part} * var(--ws-star))` }}>
          {STARS.map((i) => (
            <StarIcon key={i} />
          ))}
        </span>
      </span>
      {!hideCount && <span>({formatCount(count)})</span>}
    </span>
  );
}
