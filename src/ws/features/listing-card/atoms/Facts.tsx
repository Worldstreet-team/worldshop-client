import type { ListingWithSeller } from "@ws/lib/data/types";
import { cardFacts } from "@ws/lib/facts";
import { conditionLabel } from "./Chips";

/* The card's subtitle line, eBay item-tile style: condition, then the category's key
   facts ("Pre-owned · 256GB · Battery 89%"). One line; narrow cards keep condition and
   one fact. "For parts" reads in the warning colour. Property has no condition. */
export function KeyFacts({ listing }: { listing: Pick<ListingWithSeller, "title" | "attributes" | "category" | "condition"> }) {
  const items: { text: string; tone?: "warning" }[] = [];
  if (listing.category.kind !== "property" && listing.condition) {
    items.push({ text: conditionLabel(listing.condition), tone: listing.condition === "for_parts" ? "warning" : undefined });
  }
  for (const fact of cardFacts(listing)) items.push({ text: fact });
  return (
    <p className="ws-facts">
      {items.map((item) => (
        <span key={item.text} className="ws-facts__item" data-tone={item.tone}>
          {item.text}
        </span>
      ))}
    </p>
  );
}
