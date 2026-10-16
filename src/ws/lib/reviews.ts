import type { Review, ReviewDimensions, ReviewTopic } from "@ws/lib/data/types";

/* Review summaries (flows B3 step 7, B11, spec §7 ReviewsSection). Everything shown is
   computed from review records, never stored separately, so the stars on a card, the
   summary and the list always agree (audit F13, PLAN F7). Item and seller summaries
   use the same maths over different sets of reviews (R-073). */

export type ReviewSummary = {
  count: number;
  /** One decimal place, as shown. 0 when there are no reviews. */
  average: number;
  /** Count of reviews at each star, five down to one. */
  distribution: { stars: 5 | 4 | 3 | 2 | 1; count: number }[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summariseReviews(reviews: readonly Review[]): ReviewSummary {
  const distribution = ([5, 4, 3, 2, 1] as const).map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { count: reviews.length, average: reviews.length ? round1(total / reviews.length) : 0, distribution };
}

export const DIMENSIONS: readonly { key: keyof ReviewDimensions; label: string }[] = [
  { key: "accuracy", label: "Accurate description" },
  { key: "delivery", label: "Delivery speed" },
  { key: "communication", label: "Communication" },
  { key: "packaging", label: "Packaging" },
];

/** Detailed seller ratings (eBay's four), averaged over the seller's reviews. */
export function dimensionAverages(reviews: readonly Review[]): ReviewDimensions | null {
  // Only reviews that carry the four ratings count; the live API collects one overall score.
  const rated = reviews.flatMap((r) => (r.dimensions ? [r.dimensions] : []));
  if (!rated.length) return null;
  const avg = (key: keyof ReviewDimensions) => round1(rated.reduce((sum, d) => sum + d[key], 0) / rated.length);
  return { accuracy: avg("accuracy"), delivery: avg("delivery"), communication: avg("communication"), packaging: avg("packaging") };
}

export const TOPIC_LABELS: Record<ReviewTopic, string> = {
  as_described: "As described",
  quality: "Quality",
  value: "Value",
  delivery: "Delivery",
  communication: "Communication",
  packaging: "Packaging",
};

/** Topics mentioned, most common first (ties in label order), for the filter chips. */
export function topicCounts(reviews: readonly Review[]): { topic: ReviewTopic; label: string; count: number }[] {
  const counts = new Map<ReviewTopic, number>();
  for (const r of reviews) for (const t of r.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([topic, count]) => ({ topic, label: TOPIC_LABELS[topic], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const DAY = 86_400_000;

/** eBay shows when a review was left as a bucket, not a date (B3 step 7). */
export function timeBucket(iso: string, now: number): string {
  const days = (now - Date.parse(iso)) / DAY;
  if (days <= 31) return "Past month";
  if (days <= 183) return "Past 6 months";
  if (days <= 365) return "Past year";
  return "More than a year ago";
}
