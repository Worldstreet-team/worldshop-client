import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Star, Info } from 'lucide-react';
import {
  marketplaceReviewService,
  type MarketplaceReview,
  type ReviewSummary,
  type ReviewEligibility,
} from '@/services/marketplaceReviewService';
import { useUIStore } from '@/store/uiStore';
import ReportButton from './ReportButton';
import { toApiError } from '@/services/api';

/**
 * Reviews on a listing.
 *
 * Two things this has to communicate that an ecommerce review list does not:
 *
 *  1. What "verified" means here. There are no purchases to verify against, so
 *     the badge means the seller actually replied to this person. Saying
 *     "Verified purchase" would be a lie; saying nothing wastes the signal.
 *  2. Why someone cannot review yet. The gate is having messaged the seller, so
 *     the reason is shown up front rather than after they have written 300 words.
 */

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

// Stars are the one theme-independent color in the system (always orange,
// filled). Unfilled ones drop to the track color so they read as "empty" in
// both a light and a dark ladder.
const Stars = ({ value, size = 14 }: { value: number; size?: number }) => {
  const filled = Math.round(value);
  return (
    <span className="ws-rating" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          style={n <= filled ? undefined : { color: 'var(--ws-bg-track)', fill: 'var(--ws-bg-track)' }}
        />
      ))}
    </span>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

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

export default function ListingReviews({ listingId }: { listingId: string }) {
  const { isSignedIn } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [mine, setMine] = useState<MarketplaceReview | null>(null);

  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await marketplaceReviewService.forListing(listingId, { page, limit: 10, verifiedOnly });
      setReviews(res.data);
      setSummary(res.meta);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // A failed review list should not take the listing page down with it.
    } finally {
      setLoading(false);
    }
  }, [listingId, page, verifiedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // Only signed-in users have an eligibility answer worth asking for.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    Promise.all([
      marketplaceReviewService.eligibility(listingId).then((r) => r.data).catch(() => null),
      marketplaceReviewService.mine(listingId).then((r) => r.data).catch(() => null),
    ]).then(([elig, own]) => {
      if (cancelled) return;
      setEligibility(elig);
      setMine(own);
      if (own) {
        setRating(own.rating);
        setTitle(own.title ?? '');
        setComment(own.comment);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, listingId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (comment.trim().length < 10) {
      setFormError('Write at least a sentence so the review is useful to other buyers.');
      return;
    }

    setSubmitting(true);
    try {
      if (mine) {
        const res = await marketplaceReviewService.update(mine.id, {
          rating, title: title || null, comment: comment.trim(),
        });
        setMine(res.data);
        addToast({ type: 'success', message: 'Review updated' });
      } else {
        const res = await marketplaceReviewService.create(listingId, {
          rating, title: title || undefined, comment: comment.trim(),
        });
        setMine(res.data);
        addToast({
          type: 'success',
          message: res.data.isVerified
            ? 'Review posted.'
            : 'Review posted. It shows as verified once the seller replies to your message.',
        });
      }
      setWriting(false);
      setPage(1);
      await load();
    } catch (err: unknown) {
      setFormError(errMessage(err, 'Could not post your review'));
    } finally {
      setSubmitting(false);
    }
  };

  const removeMine = async () => {
    if (!mine || !window.confirm('Delete your review?')) return;
    try {
      await marketplaceReviewService.remove(mine.id);
      setMine(null);
      setComment('');
      setTitle('');
      addToast({ type: 'success', message: 'Review deleted' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not delete your review') });
    }
  };

  const count = summary?.reviewCount ?? 0;

  return (
    <section className="ws-detail__section">
      <h2 className="ws-h2">
        Reviews {count > 0 && <span className="ws-muted ws-num" style={{ fontWeight: 400 }}>({count})</span>}
      </h2>

      {/* ── Summary ── */}
      {count > 0 && summary && (
        <div className="ws-reviews__summary">
          <div>
            <div className="ws-reviews__score">{summary.averageRating.toFixed(1)}</div>
            <Stars value={summary.averageRating} />
            <div className="ws-caption ws-muted">
              {count} review{count === 1 ? '' : 's'}
              {summary.verifiedCount ? ` · ${summary.verifiedCount} verified` : ''}
            </div>
          </div>

          <div className="ws-reviews__bars">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const n = summary.distribution[String(star) as '1'] ?? 0;
              const pct = count ? (n / count) * 100 : 0;
              return (
                <div key={star} className="ws-reviews__bar">
                  <span>{star}</span>
                  <div className="ws-reviews__bartrack">
                    <div className="ws-reviews__barfill" style={{ width: `${pct}%` }} />
                  </div>
                  <span>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Write / edit ── */}
      {isSignedIn && (
        <div style={{ marginBottom: 'var(--ws-space-6)' }}>
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
            <button className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => setWriting(true)}>
              Write a review
            </button>
          ) : eligibility?.reason ? (
            // The gate, stated before any effort is spent on writing.
            <div className="ws-alert ws-alert--info">
              <Info size={16} aria-hidden />
              <span>{eligibility.reason}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="ws-stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="ws-body ws-muted">
          No reviews yet. Reviews here come from buyers who have actually contacted this seller.
        </p>
      ) : (
        <>
          {(summary?.verifiedCount ?? 0) > 0 && (summary?.verifiedCount ?? 0) < count && (
            <label className="ws-check" style={{ marginBottom: 'var(--ws-space-3)' }}>
              <input
                type="checkbox"
                className="ws-check__input"
                checked={verifiedOnly}
                onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
              />
              <span className="ws-check__label">
                Only show reviews from buyers the seller replied to
              </span>
            </label>
          )}

          <div className="ws-stack--lg">
            {reviews.map((r) => (
              <article key={r.id} className="ws-review">
                <div className="ws-review__head">
                  <Stars value={r.rating} size={13} />
                  <strong style={{ fontSize: 14 }}>{r.userName}</strong>

                  {/* Not "verified purchase" — nothing was purchased here. */}
                  {r.isVerified && (
                    <span
                      className="ws-badge ws-badge--success"
                      title="This buyer messaged the seller and got a reply"
                    >
                      Contacted this seller
                    </span>
                  )}

                  {r.status === 'FLAGGED' && (
                    <span className="ws-badge ws-badge--warning">Reported — under review</span>
                  )}

                  <span className="ws-review__date">{formatDate(r.createdAt)}</span>
                </div>

                {r.title && <div className="ws-title" style={{ marginTop: 'var(--ws-space-1)' }}>{r.title}</div>}
                <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--ws-space-1)' }}>
                  {r.comment}
                </p>

                {/* Shown on other people's reviews only — reporting your own is
                    meaningless, and it is the seller who usually spots a fake. */}
                {!(mine && mine.id === r.id) && (
                  <div style={{ marginTop: 'var(--ws-space-2)' }}>
                    <ReportButton
                      targetType="REVIEW"
                      targetId={r.id}
                      targetName={`Review by ${r.userName}`}
                      label="Report review"
                    />
                  </div>
                )}

                {/* The seller's answer. They have no refund or resolution lever
                    in this model, so a public reply is their only defence. */}
                {r.vendorReply && (
                  <div className="ws-review__reply">
                    <div className="ws-caption" style={{ fontWeight: 600 }}>
                      Seller replied
                      {r.vendorRepliedAt && (
                        <span className="ws-muted" style={{ fontWeight: 400 }}> · {formatDate(r.vendorRepliedAt)}</span>
                      )}
                    </div>
                    <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>
                      {r.vendorReply}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="ws-pager">
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="ws-pager__status ws-num">Page {page} of {totalPages}</span>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
