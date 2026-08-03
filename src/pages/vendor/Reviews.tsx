import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import {
  marketplaceReviewService,
  type MarketplaceReview,
  type ReviewSummary,
} from '@/services/marketplaceReviewService';
import ReportButton from '@/components/marketplace/ReportButton';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

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
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Reviews</h1>
          <p className="ws-page__sub">
            Buyers can only review you after messaging you, and reviews show as
            verified once you have replied to that message.
          </p>
        </div>
      </div>

      {summary && total > 0 && (
        <div className="ws-stats" style={{ marginBottom: 'var(--ws-space-6)' }}>
          <div className="ws-stat">
            <span className="ws-stat__label">Average Rating</span>
            <span className="ws-stat__value">
              {summary.averageRating.toFixed(1)}
              <Star size={16} aria-hidden style={{ color: 'var(--ws-accent-star, #F97316)', fill: 'var(--ws-accent-star, #F97316)', marginLeft: 4 }} />
            </span>
          </div>
          <div className="ws-stat">
            <span className="ws-stat__label">Total Reviews</span>
            <span className="ws-stat__value">{summary.reviewCount}</span>
          </div>
          <div className="ws-stat">
            <span className="ws-stat__label">5-star</span>
            <span className="ws-stat__value">{summary.distribution['5'] ?? 0}</span>
          </div>
          <div className="ws-stat">
            <span className="ws-stat__label">1-star</span>
            <span className="ws-stat__value">{summary.distribution['1'] ?? 0}</span>
          </div>
        </div>
      )}

      {total > 0 && (
        <label className="ws-check" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <input
            type="checkbox"
            className="ws-check__input"
            checked={unrepliedOnly}
            onChange={(e) => { setUnrepliedOnly(e.target.checked); setPage(1); }}
          />
          <span className="ws-check__label">
            Only show reviews I have not replied to
            {!unrepliedOnly && unrepliedCount > 0 && (
              <span style={{ color: 'var(--ws-status-warning)', fontWeight: 600 }}>
                {' '}({unrepliedCount} on this page)
              </span>
            )}
          </span>
        </label>
      )}

      {loading ? (
        <div className="ws-stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 96, borderRadius: 'var(--ws-radius-xl)' }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon">
            <Star size={26} aria-hidden />
          </div>
          <p className="ws-body ws-muted" style={{ maxWidth: '44ch' }}>
            {unrepliedOnly
              ? 'You have replied to every review. Nothing waiting.'
              : 'No reviews yet. They come from buyers who have messaged you, so answering your messages is what leads to reviews.'}
          </p>
          {!unrepliedOnly && (
            <Link to="/vendor/messages" className="ws-btn ws-btn--sm ws-btn--primary">
              Go to messages
            </Link>
          )}
        </div>
      ) : (
        <div className="ws-stack--lg">
          {reviews.map((r) => (
            <article key={r.id} className="ws-card">
              <div className="ws-review__head">
                <Stars value={r.rating} />
                <strong style={{ fontSize: 14 }}>{r.userName}</strong>

                {r.isVerified && (
                  <span className="ws-badge ws-badge--success" title="This buyer messaged you and you replied">
                    Contacted you
                  </span>
                )}

                {r.status === 'FLAGGED' && (
                  <span className="ws-badge ws-badge--warning">Reported — under review</span>
                )}

                <span className="ws-review__date">{formatDate(r.createdAt)}</span>
              </div>

              {r.product && (
                <div className="ws-caption ws-muted" style={{ marginTop: 2 }}>
                  on <Link to={`/listings/${r.product.slug}`} style={{ color: 'var(--ws-brand-gold-text)' }}>{r.product.name}</Link>
                </div>
              )}

              {r.title && <div className="ws-title" style={{ marginTop: 'var(--ws-space-2)' }}>{r.title}</div>}
              <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--ws-space-1)' }}>
                {r.comment}
              </p>

              {/* ── The reply ── */}
              {replyingTo === r.id ? (
                <div className="ws-stack" style={{ marginTop: 'var(--ws-space-3)' }}>
                  <textarea
                    className="ws-textarea"
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1000}
                    placeholder="Answer publicly. Buyers read this alongside the review, so a calm, factual reply reads better than a defensive one."
                  />
                  <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
                    <button
                      className="ws-btn ws-btn--sm ws-btn--primary"
                      disabled={saving || draft.trim().length < 2}
                      onClick={() => submitReply(r.id)}
                    >
                      {saving ? 'Posting…' : r.vendorReply ? 'Update reply' : 'Post reply'}
                    </button>
                    <button
                      className="ws-btn ws-btn--sm ws-btn--ghost"
                      onClick={() => { setReplyingTo(null); setDraft(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : r.vendorReply ? (
                <div className="ws-review__reply">
                  <div className="ws-caption" style={{ fontWeight: 600 }}>
                    Your reply
                    {r.vendorRepliedAt && (
                      <span className="ws-muted" style={{ fontWeight: 400 }}> · {formatDate(r.vendorRepliedAt)}</span>
                    )}
                  </div>
                  <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap', margin: '2px 0 var(--ws-space-2)' }}>
                    {r.vendorReply}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
                    <button className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => startReply(r)}>
                      Edit reply
                    </button>
                    <button className="ws-btn ws-btn--sm ws-btn--danger" onClick={() => removeReply(r.id)}>
                      Remove reply
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 'var(--ws-space-3)', display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
                  <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => startReply(r)}>
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
        <div className="ws-pager">
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="ws-pager__status ws-num">
            Page {page} of {totalPages} · {total} review{total === 1 ? '' : 's'}
          </span>
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
