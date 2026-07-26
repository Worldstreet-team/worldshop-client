import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  marketplaceReviewService,
  type MarketplaceReview,
  type ReviewSummary,
  type ReviewEligibility,
} from '@/services/marketplaceReviewService';
import { useUIStore } from '@/store/uiStore';
import ReportButton from './ReportButton';

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

type ApiError = { response?: { data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;

const Stars = ({ value, size = '1rem' }: { value: number; size?: string }) => (
  <span style={{ color: '#f79009', fontSize: size, letterSpacing: 1 }} aria-label={`${value} out of 5`}>
    {'★'.repeat(Math.round(value))}
    <span style={{ color: '#e4e7ec' }}>{'★'.repeat(5 - Math.round(value))}</span>
  </span>
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '1.6rem', lineHeight: 1,
            color: n <= value ? '#f79009' : '#e4e7ec',
          }}
        >
          ★
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
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.15rem' }}>Reviews {count > 0 && <span style={{ color: '#667085', fontWeight: 400 }}>({count})</span>}</h2>

      {/* ── Summary ── */}
      {count > 0 && summary && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', margin: '0.75rem 0 1.25rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{summary.averageRating.toFixed(1)}</div>
            <Stars value={summary.averageRating} />
            <div style={{ fontSize: '0.82rem', color: '#667085' }}>
              {count} review{count === 1 ? '' : 's'}
              {summary.verifiedCount ? ` · ${summary.verifiedCount} verified` : ''}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const n = summary.distribution[String(star) as '1'] ?? 0;
              const pct = count ? (n / count) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ width: 12, color: '#667085' }}>{star}</span>
                  <div style={{ flex: 1, height: 6, background: '#f2f4f7', borderRadius: 999 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f79009', borderRadius: 999 }} />
                  </div>
                  <span style={{ width: 20, color: '#667085', textAlign: 'right' }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Write / edit ── */}
      {isSignedIn && (
        <div style={{ marginBottom: '1.25rem' }}>
          {mine && !writing ? (
            <div style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '0.85rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: 4 }}>Your review</div>
              <Stars value={mine.rating} />
              <p style={{ margin: '0.35rem 0', whiteSpace: 'pre-wrap' }}>{mine.comment}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => setWriting(true)}>Edit</button>
                <button className="btn-secondary" onClick={removeMine}>Delete</button>
              </div>
            </div>
          ) : writing ? (
            <form onSubmit={submit} style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '0.85rem' }}>
              {formError && (
                <div style={{ background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.65rem' }}>
                  {formError}
                </div>
              )}

              <StarPicker value={rating} onChange={setRating} />

              <input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e4e7ec', borderRadius: 6, margin: '0.6rem 0 0.5rem' }}
              />

              <textarea
                rows={4}
                placeholder="How was dealing with this seller? What should other buyers know?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
              />

              {eligibility && !eligibility.wouldBeVerified && !mine && (
                <p style={{ fontSize: '0.8rem', color: '#98a2b3', margin: '0.35rem 0 0' }}>
                  This will show as unverified until the seller replies to your message.
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Posting…' : mine ? 'Save changes' : 'Post review'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setWriting(false)}>Cancel</button>
              </div>
            </form>
          ) : eligibility?.canReview ? (
            <button className="btn-secondary" onClick={() => setWriting(true)}>Write a review</button>
          ) : eligibility?.reason ? (
            // The gate, stated before any effort is spent on writing.
            <p style={{ fontSize: '0.88rem', color: '#667085', margin: 0 }}>
              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'text-bottom', marginRight: 4 }}>
                info
              </span>
              {eligibility.reason}
            </p>
          ) : null}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <p style={{ color: '#667085' }}>Loading reviews…</p>
      ) : count === 0 ? (
        <p style={{ color: '#667085' }}>
          No reviews yet. Reviews here come from buyers who have actually contacted this seller.
        </p>
      ) : (
        <>
          {(summary?.verifiedCount ?? 0) > 0 && (summary?.verifiedCount ?? 0) < count && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475467', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
              />
              Only show reviews from buyers the seller replied to
            </label>
          )}

          <div style={{ display: 'grid', gap: '1rem' }}>
            {reviews.map((r) => (
              <article key={r.id} style={{ borderTop: '1px solid #f2f4f7', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Stars value={r.rating} size="0.9rem" />
                  <strong style={{ fontSize: '0.9rem' }}>{r.userName}</strong>

                  {/* Not "verified purchase" — nothing was purchased here. */}
                  {r.isVerified && (
                    <span
                      title="This buyer messaged the seller and got a reply"
                      style={{ background: '#ecfdf3', color: '#027a48', padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      Contacted this seller
                    </span>
                  )}

                  {r.status === 'FLAGGED' && (
                    <span style={{ background: '#fffaeb', color: '#b54708', padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
                      Reported — under review
                    </span>
                  )}

                  <span style={{ color: '#98a2b3', fontSize: '0.78rem', marginLeft: 'auto' }}>
                    {formatDate(r.createdAt)}
                  </span>
                </div>

                {r.title && <div style={{ fontWeight: 600, marginTop: '0.3rem' }}>{r.title}</div>}
                <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap', color: '#344054', lineHeight: 1.55 }}>
                  {r.comment}
                </p>

                {/* The seller's answer. They have no refund or resolution lever
                    in this model, so a public reply is their only defence. */}
                {/* Shown on other people's reviews only — reporting your own
                    is meaningless, and it is the seller who usually spots a
                    fake one. */}
                {!(mine && mine.id === r.id) && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <ReportButton
                      targetType="REVIEW"
                      targetId={r.id}
                      targetName={`Review by ${r.userName}`}
                      label="Report review"
                    />
                  </div>
                )}

                {r.vendorReply && (
                  <div style={{ marginTop: '0.6rem', marginLeft: '1rem', paddingLeft: '0.75rem', borderLeft: '3px solid #e4e7ec' }}>
                    <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>
                      Seller replied
                      {r.vendorRepliedAt && <span style={{ fontWeight: 400 }}> · {formatDate(r.vendorRepliedAt)}</span>}
                    </div>
                    <p style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap', color: '#475467' }}>{r.vendorReply}</p>
                  </div>
                )}
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span style={{ color: '#667085' }}>Page {page} of {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
