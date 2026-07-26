import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  marketplaceReviewService,
  type MarketplaceReview,
  type ReviewSummary,
} from '@/services/marketplaceReviewService';
import ReportButton from '@/components/marketplace/ReportButton';
import { useUIStore } from '@/store/uiStore';

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

type ApiError = { response?: { data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

const Stars = ({ value }: { value: number }) => (
  <span aria-label={`${value} out of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`material-icons star ${i < value ? 'filled' : ''}`} style={{ color: i < value ? '#f79009' : '#e4e7ec', fontSize: '1.1rem' }}>
        {i < value ? 'star' : 'star_border'}
      </span>
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
    <div className="vendor-reviews">
      <div className="page-header">
        <h1>Reviews</h1>
        <p style={{ color: '#667085' }}>
          Buyers can only review you after messaging you, and reviews show as
          verified once you have replied to that message.
        </p>
      </div>

      {summary && total > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Average Rating</span>
              <span className="stat-value">{summary.averageRating.toFixed(1)} ★</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Reviews</span>
              <span className="stat-value">{summary.reviewCount}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">5-star</span>
              <span className="stat-value">{summary.distribution['5'] ?? 0}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">1-star</span>
              <span className="stat-value">{summary.distribution['1'] ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {total > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', color: '#475467' }}>
          <input
            type="checkbox"
            checked={unrepliedOnly}
            onChange={(e) => { setUnrepliedOnly(e.target.checked); setPage(1); }}
          />
          Only show reviews I have not replied to
          {!unrepliedOnly && unrepliedCount > 0 && (
            <span style={{ color: '#b54708', fontWeight: 600 }}>({unrepliedCount} on this page)</span>
          )}
        </label>
      )}

      {loading ? (
        <p style={{ color: '#667085' }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#667085' }}>
          <span className="material-icons" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
            star_border
          </span>
          <p style={{ marginBottom: '0.75rem' }}>
            {unrepliedOnly
              ? 'You have replied to every review. Nothing waiting.'
              : 'No reviews yet. They come from buyers who have messaged you, so answering your messages is what leads to reviews.'}
          </p>
          {!unrepliedOnly && <Link to="/vendor/messages" className="btn-secondary">Go to messages</Link>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map((r) => (
            <article key={r.id} style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Stars value={r.rating} />
                <strong style={{ fontSize: '0.92rem' }}>{r.userName}</strong>

                {r.isVerified && (
                  <span
                    title="This buyer messaged you and you replied"
                    style={{ background: '#ecfdf3', color: '#027a48', padding: '0.1rem 0.45rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}
                  >
                    Contacted you
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

              {r.product && (
                <div style={{ fontSize: '0.82rem', color: '#667085', marginTop: 2 }}>
                  on <Link to={`/listings/${r.product.slug}`}>{r.product.name}</Link>
                </div>
              )}

              {r.title && <div style={{ fontWeight: 600, marginTop: '0.4rem' }}>{r.title}</div>}
              <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap', color: '#344054', lineHeight: 1.55 }}>
                {r.comment}
              </p>

              {/* ── The reply ── */}
              {replyingTo === r.id ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1000}
                    placeholder="Answer publicly. Buyers read this alongside the review, so a calm, factual reply reads better than a defensive one."
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn-primary" disabled={saving || draft.trim().length < 2} onClick={() => submitReply(r.id)}>
                      {saving ? 'Posting…' : r.vendorReply ? 'Update reply' : 'Post reply'}
                    </button>
                    <button className="btn-secondary" onClick={() => { setReplyingTo(null); setDraft(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : r.vendorReply ? (
                <div style={{ marginTop: '0.75rem', marginLeft: '1rem', paddingLeft: '0.75rem', borderLeft: '3px solid #e4e7ec' }}>
                  <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>
                    Your reply
                    {r.vendorRepliedAt && <span style={{ fontWeight: 400 }}> · {formatDate(r.vendorRepliedAt)}</span>}
                  </div>
                  <p style={{ margin: '0.2rem 0 0.4rem', whiteSpace: 'pre-wrap', color: '#475467' }}>{r.vendorReply}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => startReply(r)}>Edit reply</button>
                    <button className="btn-secondary" onClick={() => removeReply(r.id)}>Remove reply</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="btn-primary" onClick={() => startReply(r)}>Reply publicly</button>
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span style={{ color: '#667085' }}>Page {page} of {totalPages} · {total} review{total === 1 ? '' : 's'}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
