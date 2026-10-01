import { useState } from 'react';
import { BadgeCheck, Info, Star, ThumbsUp } from 'lucide-react';
import { useListingReviews } from '@/features/reviews/hooks/useListingReviews';
import type { MarketplaceReview } from '@/features/reviews/api';
import ReportButton from '@/features/reports/components/ReportButton';
import Stars from '@/features/reviews/components/Stars';

const FIRST_SHOWN = 3;
/** Past this a review is cut, with the rest behind "Read more". */
const CLAMP_AT = 180;

type Sort = 'newest' | 'helpful' | 'lowest';
const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'newest', label: 'Newest' },
  { key: 'helpful', label: 'Most helpful' },
  { key: 'lowest', label: 'Lowest' },
];

// Assembled by hand: en-GB puts the day first but abbreviates September as
// "Sept", and en-US has "Sep" but the wrong order.
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' });
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH.format(d)} ${d.getFullYear()}`;
};

const initials = (name: string) =>
  name.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();

function sortReviews(rows: MarketplaceReview[], sort: Sort): MarketplaceReview[] {
  const out = [...rows];
  if (sort === 'helpful') return out.sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0));
  if (sort === 'lowest') return out.sort((a, b) => a.rating - b.rating);
  return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * Five stars filled to a fraction, so 4.8 reads as 4.8 and not as 5. Each star
 * is an outline with a filled copy clipped over it.
 */
function StarMeter({ value, size }: { value: number; size: number }) {
  return (
    <span className="ws-ldmeter" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="ws-ldmeter__star" style={{ width: size, height: size }}>
            <Star size={size} aria-hidden />
            {fill > 0 && (
              <span style={{ width: `${fill * 100}%` }}>
                <Star size={size} aria-hidden className="ws-solid" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="ws-rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="ws-rating__star"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <Star
            size={22}
            aria-hidden
            style={n <= value ? undefined : { color: 'var(--ws-bg-track)', fill: 'var(--ws-bg-track)' }}
          />
        </button>
      ))}
    </div>
  );
}

type ListingReviewsProps = {
  /**
   * The listing reviews are written against. Omitted on a store page, which
   * only reads them: a review always belongs to a listing the buyer asked about.
   */
  listingId?: string;
  /** Lists everything written about the seller; reviews are still written against the listing. */
  storeSlug: string;
  /** Off where a tab label already says what this is. */
  heading?: boolean;
};

export default function ListingReviews({ listingId = '', storeSlug, heading = true }: ListingReviewsProps) {
  const {
    isSignedIn, reviews, summary, count, loading, totalPages, page, setPage,
    verifiedOnly, setVerifiedOnly, eligibility, mine, writing, setWriting,
    rating, setRating, title, setTitle, comment, setComment,
    formError, submitting, submit, removeMine,
  } = useListingReviews(listingId, storeSlug);

  const [star, setStar] = useState<number | null>(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [sort, setSort] = useState<Sort>('newest');
  const [shown, setShown] = useState(FIRST_SHOWN);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Helpful votes have no endpoint yet, so they last as long as the page does.
  const [votes, setVotes] = useState<Record<string, 'yes' | 'no'>>({});

  // Every control that changes which reviews match folds the list back up.
  const refine = (change: () => void) => {
    change();
    setShown(FIRST_SHOWN);
  };

  const matching = sortReviews(
    reviews.filter((r) => (star == null || r.rating === star) && (!withPhotos || (r.photos?.length ?? 0) > 0)),
    sort,
  );
  const visible = matching.slice(0, shown);
  const hidden = matching.length - visible.length;
  // Star and photo filters only see the page that is loaded, so they report
  // what they matched. Without them the honest number is the seller's total.
  const total = star == null && !withPhotos ? count : matching.length;

  const vote = (id: string, choice: 'yes' | 'no') =>
    setVotes((v) => {
      const next = { ...v };
      if (next[id] === choice) delete next[id];
      else next[id] = choice;
      return next;
    });

  return (
    <section
      id="reviews"
      className={`ws-ldreviews${heading ? '' : ' ws-ldreviews--bare'}`}
      aria-labelledby={heading ? 'reviews-h' : undefined}
      aria-label={heading ? undefined : 'Reviews for this seller'}
    >
      {heading && <h2 id="reviews-h" className="ws-ldreviews__title">Reviews for this seller</h2>}

      {count > 0 && summary && (
        <div className="ws-ldreviews__summary">
          <div className="ws-ldreviews__score">
            <p className="ws-num">{summary.averageRating.toFixed(1)}</p>
            <StarMeter value={summary.averageRating} size={24} />
            <span>
              {count.toLocaleString()} rating{count === 1 ? '' : 's'}
            </span>
          </div>

          <ul className="ws-ldreviews__bars" aria-label="Ratings by star">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const total = summary.distribution[String(n) as '1'] ?? 0;
              const pct = count ? Math.round((total / count) * 100) : 0;
              return (
                <li key={n}>
                  <button
                    type="button"
                    aria-pressed={star === n}
                    disabled={total === 0}
                    onClick={() => refine(() => setStar(star === n ? null : n))}
                  >
                    <span className="ws-num">
                      {n}
                      <Star size={14} aria-hidden className="ws-solid ws-ldstar" />
                    </span>
                    <span
                      className="ws-ldreviews__track"
                      role="progressbar"
                      aria-label={`${n} stars`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-valuetext={`${total.toLocaleString()} ratings, ${pct}%`}
                    >
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className="ws-num">{pct}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isSignedIn && listingId && (
        <div>
          {mine && !writing ? (
            <div className="ws-card">
              <span className="ws-label">Your review</span>
              <Stars value={mine.rating} />
              <p className="ws-body" style={{ whiteSpace: 'pre-wrap', margin: 'var(--ws-space-2) 0' }}>
                {mine.comment}
              </p>
              <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
                <button className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => setWriting(true)}>
                  Edit
                </button>
                <button className="ws-btn ws-btn--sm ws-btn--danger" onClick={removeMine}>
                  Delete
                </button>
              </div>
            </div>
          ) : writing ? (
            <form onSubmit={submit} className="ws-card ws-stack">
              {formError && (
                <div className="ws-alert" role="alert">
                  <Info size={16} aria-hidden />
                  <span>{formError}</span>
                </div>
              )}

              <StarPicker value={rating} onChange={setRating} />

              <input
                className="ws-field"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />

              <textarea
                className="ws-textarea"
                rows={4}
                placeholder="How was dealing with this seller? What should other buyers know?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
              />

              {eligibility && !eligibility.wouldBeVerified && !mine && (
                <p className="ws-caption ws-subtle">
                  This will show as unverified until the seller replies to your message.
                </p>
              )}

              <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
                <button type="submit" className="ws-btn ws-btn--sm ws-btn--primary" disabled={submitting}>
                  {submitting ? 'Posting…' : mine ? 'Save changes' : 'Post review'}
                </button>
                <button
                  type="button"
                  className="ws-btn ws-btn--sm ws-btn--ghost"
                  onClick={() => setWriting(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : eligibility?.canReview ? (
            <button className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline" onClick={() => setWriting(true)}>
              Write a review
            </button>
          ) : eligibility?.reason ? (
            <div className="ws-alert ws-alert--info">
              <Info size={16} aria-hidden />
              <span>{eligibility.reason}</span>
            </div>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="ws-stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="ws-ldreviews__empty">
          No reviews yet. Reviews here come from buyers who have actually contacted this seller.
        </p>
      ) : (
        <>
          <div className="ws-ldreviews__controls">
            <div role="group" aria-label="Review filters (choose any)" className="ws-ldreviews__pills">
              <button
                type="button"
                className={`ws-pill${withPhotos ? ' is-active' : ''}`}
                aria-pressed={withPhotos}
                onClick={() => refine(() => setWithPhotos(!withPhotos))}
              >
                With photos
              </button>
              <button
                type="button"
                className={`ws-pill${verifiedOnly ? ' is-active' : ''}`}
                aria-pressed={verifiedOnly}
                onClick={() => refine(() => { setVerifiedOnly(!verifiedOnly); setPage(1); })}
              >
                Verified purchases
              </button>
            </div>

            <div role="group" aria-label="Sort reviews" className="ws-ldseg">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sort === s.key}
                  onClick={() => refine(() => setSort(s.key))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="ws-ldreviews__count" aria-live="polite">
            {total.toLocaleString()} review{total === 1 ? '' : 's'}
          </p>

          <div>
            {visible.map((r) => {
              const long = r.comment.length > CLAMP_AT && !expanded.has(r.id);
              const helpful = (r.helpfulCount ?? 0) + (votes[r.id] === 'yes' ? 1 : 0);
              const bodyId = `review-${r.id}`;
              return (
                <article
                  key={r.id}
                  className="ws-ldreview"
                  aria-label={`Review by ${r.userName}, ${r.rating} out of 5`}
                >
                  <header>
                    <span className="ws-ldreview__avatar" aria-hidden>{initials(r.userName)}</span>
                    <div>
                      <div className="ws-ldreview__who">
                        <p>{r.userName}</p>
                        {r.isVerified && (
                          <span
                            className="ws-ldbadge ws-ldbadge--success"
                            title="This buyer messaged the seller and got a reply"
                          >
                            <BadgeCheck size={12} aria-hidden className="ws-solid ws-solid--cut" />
                            Verified purchase
                          </span>
                        )}
                        {r.status === 'FLAGGED' && (
                          <span className="ws-ldbadge ws-ldbadge--warning">Reported, under review</span>
                        )}
                      </div>
                      <p className="ws-ldreview__meta">
                        <StarMeter value={r.rating} size={14} />
                        <time dateTime={r.createdAt.slice(0, 10)}>{formatDate(r.createdAt)}</time>
                        {r.product && <span>· {r.product.name}</span>}
                      </p>
                    </div>
                  </header>

                  <div>
                    {r.title && <h3 className="ws-ldreview__title">{r.title}</h3>}
                    <p id={bodyId} className="ws-ldreview__body">
                      {long ? `${r.comment.slice(0, CLAMP_AT).trimEnd()}…` : r.comment}
                    </p>
                    {r.comment.length > CLAMP_AT && (
                      <button
                        type="button"
                        className="ws-ldreview__more"
                        aria-expanded={!long}
                        aria-controls={bodyId}
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                      >
                        {long ? 'Read more' : 'Read less'}
                      </button>
                    )}
                  </div>

                  {(r.photos?.length ?? 0) > 0 && (
                    <ul className="ws-ldreview__photos" aria-label="Photos from this review">
                      {r.photos?.map((src) => (
                        <li key={src}>
                          <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Open review photo">
                            <img src={src} alt="" loading="lazy" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {r.vendorReply && (
                    <div className="ws-ldreview__reply">
                      <p>
                        Reply from the seller
                        {r.vendorRepliedAt && (
                          <time dateTime={r.vendorRepliedAt.slice(0, 10)}> · {formatDate(r.vendorRepliedAt)}</time>
                        )}
                      </p>
                      <p>{r.vendorReply}</p>
                    </div>
                  )}

                  <div className="ws-ldreview__foot">
                    <span>Helpful?</span>
                    <button
                      type="button"
                      className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost"
                      aria-pressed={votes[r.id] === 'yes'}
                      onClick={() => vote(r.id, 'yes')}
                    >
                      <ThumbsUp size={14} aria-hidden className="ws-solid" />
                      Yes ({helpful})
                    </button>
                    <button
                      type="button"
                      className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost"
                      aria-pressed={votes[r.id] === 'no'}
                      onClick={() => vote(r.id, 'no')}
                    >
                      No
                    </button>
                    {!(mine && mine.id === r.id) && (
                      <ReportButton
                        targetType="REVIEW"
                        targetId={r.id}
                        targetName={`Review by ${r.userName}`}
                        label="Report review"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {hidden > 0 && (
            <button
              type="button"
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline"
              onClick={() => setShown(matching.length)}
            >
              Show more reviews ({hidden})
            </button>
          )}

          {totalPages > 1 && hidden === 0 && (
            <div className="ws-pager">
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => refine(() => setPage((p) => p - 1))}
              >
                Previous
              </button>
              <span className="ws-pager__status ws-num">Page {page} of {totalPages}</span>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => refine(() => setPage((p) => p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
