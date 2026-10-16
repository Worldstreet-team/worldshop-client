"use client";

import { useId, useState } from "react";
import { CheckCircleIcon, StarIcon } from "@ws/components/icons";
import { Button, Chip, EmptyState, Tabs, tabPanelProps } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { RatingStars } from "@ws/features/listing-card/atoms/RatingStars";
import type { Review, ReviewTopic } from "@ws/lib/data/types";
import { formatCount, plural } from "@ws/lib/format";
import { summariseReviews, timeBucket, topicCounts, type ReviewSummary } from "@ws/lib/reviews";

/* ReviewsSection (spec §7; flows B3 step 7, B11; eBay feedback): tabs for this item and
   for all of the seller's items, a summary with the star spread, topic chips that filter
   the list, and cards with the masked buyer, "Verified purchase", a time bucket and the
   seller's reply. This item's stars and the seller's are never mixed (R-073). */

type Scope = "item" | "seller";

type Props = {
  itemReviews: readonly Review[];
  sellerReviews: readonly Review[];
  shopName: string;
  /** Titles of the seller's listings, so cards on the seller tab say what was bought. */
  titles: Readonly<Record<string, string>>;
  now: number;
};

export function ReviewsSection({ itemReviews, sellerReviews, shopName, titles, now }: Props) {
  const idBase = useId();
  const [scope, setScope] = useState<Scope>(itemReviews.length || !sellerReviews.length ? "item" : "seller");
  const reviews = scope === "item" ? itemReviews : sellerReviews;

  return (
    <section className="ws-reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="ws-section-title">
        Ratings and reviews
      </h2>
      <Tabs
        aria-label="Reviews to show"
        variant="line"
        idBase={idBase}
        value={scope}
        onChange={setScope}
        items={[
          { value: "item", label: `This item (${formatCount(itemReviews.length)})` },
          {
            value: "seller",
            label: (
              <>
                All items<span className="cx-sr-only"> from {shopName}</span> ({formatCount(sellerReviews.length)})
              </>
            ),
          },
        ]}
      />
      <div {...tabPanelProps(idBase, scope)} className="ws-reviews__panel">
        {/* A new key per tab resets the filter and "Show more". */}
        <ReviewList
          key={scope}
          reviews={reviews}
          scope={scope}
          shopName={shopName}
          titles={titles}
          now={now}
          onSeeSeller={scope === "item" && sellerReviews.length ? () => setScope("seller") : undefined}
        />
      </div>
    </section>
  );
}

type ListProps = {
  reviews: readonly Review[];
  scope: Scope;
  shopName: string;
  titles: Readonly<Record<string, string>>;
  now: number;
  onSeeSeller?: () => void;
  /** Keep the page's heading order (h3 inside the listing page's reviews section). */
  headingLevel?: "h2" | "h3";
};

export function ReviewList({ reviews, scope, shopName, titles, now, onSeeSeller, headingLevel = "h3" }: ListProps) {
  const [topic, setTopic] = useState<ReviewTopic | null>(null);
  const [shown, setShown] = useState<number>(rules.listing.reviewsShown);
  const [announce, setAnnounce] = useState("");

  if (!reviews.length) {
    return (
      <EmptyState
        icon={<StarIcon />}
        title={scope === "item" ? "No reviews of this item yet" : `No reviews for ${shopName} yet`}
        headingLevel={headingLevel}
        action={
          onSeeSeller && (
            <Button variant="ghost" size="sm" onClick={onSeeSeller}>
              See reviews of {shopName}&apos;s other items
            </Button>
          )
        }
      >
        Only buyers who completed an order can review, so every review here is from a real purchase.
      </EmptyState>
    );
  }

  const filtered = topic ? reviews.filter((r) => r.topics.includes(topic)) : reviews;
  const visible = filtered.slice(0, shown);
  const more = Math.min(rules.listing.reviewsStep, filtered.length - visible.length);

  return (
    <>
      <RatingSummary summary={summariseReviews(reviews)} scope={scope} />

      <div className="ws-reviews__topics" role="group" aria-label="Filter reviews by topic">
        <button type="button" className="ws-topic" aria-pressed={topic === null} onClick={() => { setTopic(null); setShown(rules.listing.reviewsShown); }}>
          All ({formatCount(reviews.length)})
        </button>
        {topicCounts(reviews).map((t) => (
          <button key={t.topic} type="button" className="ws-topic" aria-pressed={topic === t.topic} onClick={() => { setTopic(topic === t.topic ? null : t.topic); setShown(rules.listing.reviewsShown); }}>
            {t.label} ({formatCount(t.count)})
          </button>
        ))}
      </div>

      <ol className="ws-reviews__list">
        {visible.map((r) => (
          <li key={r.id}>
            <ReviewCard review={r} shopName={shopName} itemTitle={scope === "seller" ? titles[r.listing_id] : undefined} now={now} />
          </li>
        ))}
      </ol>

      {more > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="ws-reviews__more"
          onClick={() => {
            setShown((n) => n + more);
            setAnnounce(`${plural(more, "more review")} shown`);
          }}
        >
          Show {more} more {more === 1 ? "review" : "reviews"}
        </Button>
      )}
      <p className="cx-sr-only" role="status">
        {announce}
      </p>
    </>
  );
}

function RatingSummary({ summary, scope }: { summary: ReviewSummary; scope: Scope }) {
  const kind = scope === "item" ? "item" : "seller";
  return (
    <div className="ws-rsum">
      <div className="ws-rsum__score">
        <p className="ws-rsum__avg cx-num" aria-hidden="true">
          {summary.average.toFixed(1)}
        </p>
        <RatingStars value={summary.average} count={summary.count} kind={kind} size="lg" hideCount />
        <p className="ws-rsum__count">
          {scope === "item" ? plural(summary.count, "review of this item", "reviews of this item") : plural(summary.count, "review of their items", "reviews of their items")}
        </p>
      </div>
      <ul className="ws-rsum__bars" aria-label="Reviews by star rating">
        {summary.distribution.map(({ stars, count }) => (
          <li key={stars}>
            <span className="ws-rsum__label">{plural(stars, "star")}</span>
            <span className="ws-rsum__bar" aria-hidden="true">
              <span style={{ width: summary.count ? `${(count / summary.count) * 100}%` : 0 }} />
            </span>
            <span className="ws-rsum__n cx-num">{formatCount(count)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ review: r, shopName, itemTitle, now }: { review: Review; shopName: string; itemTitle?: string; now: number }) {
  return (
    <article className="ws-review">
      <header className="ws-review__head">
        <p className="ws-review__buyer">
          <span className="cx-sr-only">Buyer </span>
          {r.buyer}{r.buyer_feedback_count !== undefined && <> <span className="ws-review__fb">({formatCount(r.buyer_feedback_count)})</span></>}
        </p>
        {/* The stars component names an aggregate ("…, 52 ratings"); one review says its own score. */}
        <span aria-hidden="true">
          <RatingStars value={r.rating} count={1} hideCount />
        </span>
        <span className="cx-sr-only">Rated {r.rating} out of 5</span>
        <Chip tone="gain" className="ws-chip-icon">
          <CheckCircleIcon />
          Verified purchase
        </Chip>
        <time className="ws-review__when" dateTime={r.created_at}>
          {timeBucket(r.created_at, now)}
        </time>
      </header>
      {itemTitle && <p className="ws-review__item">Bought: {itemTitle}</p>}
      <p className="ws-review__text">{r.text}</p>
      {r.reply && (
        <div className="ws-review__reply">
          <p className="ws-review__replyby">Reply from {shopName}</p>
          <p>{r.reply.text}</p>
        </div>
      )}
    </article>
  );
}
