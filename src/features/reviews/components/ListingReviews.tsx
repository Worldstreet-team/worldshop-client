import { Star, Info } from 'lucide-react';
import { useListingReviews } from '@/features/reviews/hooks/useListingReviews';
import ReportButton from '@/features/reports/components/ReportButton';

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
  const {
    isSignedIn, reviews, summary, count, loading, totalPages, page, setPage,
    verifiedOnly, setVerifiedOnly, eligibility, mine, writing, setWriting,
    rating, setRating, title, setTitle, comment, setComment,
    formError, submitting, submit, removeMine,
  } = useListingReviews(listingId);

  return (
    <section className="ws-detail__section">
      <h2 className="ws-h2">
        Reviews {count > 0 && <span className="ws-muted ws-num" style={{ fontWeight: 400 }}>({count})</span>}
      </h2>

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
