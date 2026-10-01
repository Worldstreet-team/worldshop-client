import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, ChevronLeft, ChevronRight, MessageSquareText, Star, ThumbsDown, ThumbsUp,
} from 'lucide-react';
import {
  VendorBadge, VendorPage, VendorPageHead, VendorStat,
} from '@/features/stores/components/vendor/VendorPage';
import {
  marketplaceReviewService,
  type MarketplaceReview,
  type ReviewSummary,
} from '@/features/reviews/api';
import ReportButton from '@/features/reports/components/ReportButton';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';

/**
 * The vendor's view of reviews on their store.
 *
 * Its real job is the right of reply. A vendor here has no refund, no
 * resolution and no way to make anything right — a public response is their
 * only answer to an unfair review, so replying is the primary action rather
 * than a buried one.
 *
 * Unanswered reviews come first by default, because that is the work.
 */

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

const initialsOf = (name: string) =>
  name.split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase();

// Assembled by hand: en-GB and en-NG abbreviate September as "Sept".
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' });
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH.format(d)} ${d.getFullYear()}`;
};

const Stars = ({ value }: { value: number }) => (
  <span className="ws-rating" aria-label={`${value} out of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        aria-hidden
        style={i < value ? undefined : { color: 'var(--ws-bg-track)', fill: 'var(--ws-bg-track)' }}
      />
    ))}
  </span>
);

export default function VendorReviews() {
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // The dashboard links here with ?unreplied=1 when it reports a backlog, so
  // arriving from that alert lands on the filtered view rather than page one of
  // everything.
  const [searchParams] = useSearchParams();
  const [unrepliedOnly, setUnrepliedOnly] = useState(searchParams.get('unreplied') === '1');
  const [loading, setLoading] = useState(true);

  // Which review is being replied to, and the draft for it.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketplaceReviewService.mineAsVendor({ page, limit: 10, unrepliedOnly });
      setReviews(res.data);
      setSummary(res.meta);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not load your reviews') });
    } finally {
      setLoading(false);
    }
  }, [page, unrepliedOnly, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const startReply = (review: MarketplaceReview) => {
    setReplyingTo(review.id);
    setDraft(review.vendorReply ?? '');
  };

  const submitReply = async (reviewId: string) => {
    const reply = draft.trim();
    if (reply.length < 2) return;

    setSaving(true);
    try {
      const res = await marketplaceReviewService.reply(reviewId, reply);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data : r)));
      setReplyingTo(null);
      setDraft('');
      addToast({ type: 'success', message: 'Your reply is now public' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not post your reply') });
    } finally {
      setSaving(false);
    }
  };

  const removeReply = async (reviewId: string) => {
    if (!window.confirm('Remove your reply? The review itself stays.')) return;
    try {
      const res = await marketplaceReviewService.removeReply(reviewId);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data : r)));
      addToast({ type: 'success', message: 'Reply removed' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not remove your reply') });
    }
  };

  const unrepliedCount = reviews.filter((r) => !r.vendorReply).length;

  return (
    <VendorPage>
      <VendorPageHead
        title="Reviews"
        description="Buyers can only review you after messaging you, and reviews show as verified once you have replied to that message."
      />

      {summary && total > 0 && (
        <section aria-label="Review summary" className="ws-vxstats ws-vxreviews__stats">
          <VendorStat label="Average rating" value={summary.averageRating.toFixed(1)} detail="Out of 5" icon={Star} />
          <VendorStat label="Total reviews" value={summary.reviewCount} icon={MessageSquareText} />
          <VendorStat label="5-star" value={summary.distribution['5'] ?? 0} icon={ThumbsUp} />
          <VendorStat label="1-star" value={summary.distribution['1'] ?? 0} icon={ThumbsDown} />
        </section>
      )}

      {total > 0 && (
        <div className="ws-vxreviews__bar">
          <div className="ws-segmented" role="group" aria-label="Which reviews">
            <button
              type="button"
              aria-pressed={!unrepliedOnly}
              className={`ws-segmented__btn${!unrepliedOnly ? ' is-active' : ''}`}
              onClick={() => { setUnrepliedOnly(false); setPage(1); }}
            >
              All
            </button>
            <button
              type="button"
              aria-pressed={unrepliedOnly}
              className={`ws-segmented__btn${unrepliedOnly ? ' is-active' : ''}`}
              onClick={() => { setUnrepliedOnly(true); setPage(1); }}
            >
              Needs a reply
              {!unrepliedOnly && unrepliedCount > 0 && (
                <span className="ws-pill__count ws-num">{unrepliedCount}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ws-vxreviews__list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 120, borderRadius: 'var(--ws-radius-lg)' }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="ws-cxempty">
          <div className="ws-cxempty__inner">
            <span className="ws-cxempty__icon"><Star size={20} aria-hidden /></span>
            <p className="ws-cxempty__title">{unrepliedOnly ? 'Nothing waiting' : 'No reviews yet'}</p>
            <p className="ws-cxempty__body">
              {unrepliedOnly
                ? 'You have replied to every review.'
                : 'They come from buyers who have messaged you, so answering your messages is what leads to reviews.'}
            </p>
            {!unrepliedOnly && (
              <div className="ws-cxempty__action">
                <Link to="/vendor/messages" className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary">Go to messages</Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ws-vxreviews__list">
          {reviews.map((r) => (
            <article key={r.id} className="ws-vxcard ws-vxcard--pad ws-vxreview">
              <header className="ws-vxreview__head">
                <span className="ws-vxavatar ws-vxavatar--md" aria-hidden>
                  {initialsOf(r.userName)}
                </span>
                <div className="ws-vxreview__who">
                  <p>
                    <strong>{r.userName}</strong>
                    {r.isVerified && (
                      <VendorBadge tone="success" icon={BadgeCheck}>Contacted you</VendorBadge>
                    )}
                    {r.status === 'FLAGGED' && <VendorBadge tone="pending">Reported, under review</VendorBadge>}
                  </p>
                  <p className="ws-vxreview__meta">
                    <Stars value={r.rating} />
                    <time dateTime={r.createdAt.slice(0, 10)}>{formatDate(r.createdAt)}</time>
                    {r.product && (
                      <>
                        {' · on '}
                        <Link to={`/listings/${r.product.slug}`}>{r.product.name}</Link>
                      </>
                    )}
                  </p>
                </div>
              </header>

              {r.title && <h3 className="ws-vxreview__title">{r.title}</h3>}
              <p className="ws-vxreview__body">{r.comment}</p>

              {/* ── The reply ── */}
              {replyingTo === r.id ? (
                <div className="ws-vxreview__compose">
                  <textarea
                    className="ws-vxinput ws-vxinput--area"
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1000}
                    aria-label={`Reply to ${r.userName}`}
                    placeholder="Answer publicly. Buyers read this alongside the review, so a calm, factual reply reads better than a defensive one."
                  />
                  <div className="ws-vxreview__actions">
                    <button
                      className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary"
                      disabled={saving || draft.trim().length < 2}
                      onClick={() => submitReply(r.id)}
                    >
                      {saving ? 'Posting…' : r.vendorReply ? 'Update reply' : 'Post reply'}
                    </button>
                    <button
                      className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost"
                      onClick={() => { setReplyingTo(null); setDraft(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : r.vendorReply ? (
                <div className="ws-vxreview__reply">
                  <p className="ws-vxreview__replyhead">
                    Your reply
                    {r.vendorRepliedAt && <span> · {formatDate(r.vendorRepliedAt)}</span>}
                  </p>
                  <p className="ws-vxreview__body">{r.vendorReply}</p>
                  <div className="ws-vxreview__actions">
                    <button className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--outline" onClick={() => startReply(r)}>
                      Edit reply
                    </button>
                    <button className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost ws-vxreview__remove" onClick={() => removeReply(r.id)}>
                      Remove reply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ws-vxreview__actions">
                  <button className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary" onClick={() => startReply(r)}>
                    Reply publicly
                  </button>
                  {/* The seller is usually the one who spots a fake review, so
                      this is deliberately available to them here. */}
                  <ReportButton
                    targetType="REVIEW"
                    targetId={r.id}
                    targetName={`Review by ${r.userName}`}
                    label="Report this review"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="ws-vxpager ws-vxreviews__pager">
          <span className="ws-vxpager__range ws-num">
            Page {page} of {totalPages} · {total} review{total === 1 ? '' : 's'}
          </span>
          <nav aria-label="Review pages" className="ws-vxpager__nav">
            <button
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </nav>
        </div>
      )}
    </VendorPage>
  );
}
