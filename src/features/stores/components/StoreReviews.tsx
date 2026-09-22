import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BadgeCheck, MessageSquareText } from 'lucide-react';
import { marketplaceReviewService } from '@/features/reviews/api';
import Stars from '@/features/reviews/components/Stars';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const PER_PAGE = 6;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function StoreReviews({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: queryKeys.storeReviews(slug, { page }),
    queryFn: () => marketplaceReviewService.forStore(slug, { page, limit: PER_PAGE }),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  const summary = query.data?.meta;
  const reviews = query.data?.data ?? [];
  const count = summary?.reviewCount ?? 0;
  const totalPages = query.data?.pagination.totalPages ?? 1;

  return (
    <div>
      {query.isPending ? (
        <div className="ws-storereviews">
          <div className="ws-skeleton" style={{ height: 180, borderRadius: 'var(--ws-radius-xl)' }} />
          <div className="ws-storereviews__list">
            {[0, 1].map((i) => (
              <div key={i} className="ws-skeleton" style={{ height: 150, borderRadius: 'var(--ws-radius-xl)' }} />
            ))}
          </div>
        </div>
      ) : count === 0 || !summary ? (
        <div className="ws-storereviews__none">
          <span className="ws-empty__icon"><MessageSquareText size={20} aria-hidden /></span>
          <div>
            <h3 className="ws-title">No reviews yet</h3>
            <p className="ws-caption ws-muted">
              Reviews come only from buyers who messaged this seller. Messaged them about a listing? You can
              review them from that listing's page.
            </p>
          </div>
        </div>
      ) : (
        <div className="ws-storereviews">
          <div className="ws-storereviews__summary">
            <div className="ws-reviews__score">{summary.averageRating.toFixed(1)}</div>
            <Stars value={summary.averageRating} size={16} />
            <p className="ws-caption ws-muted">
              {count.toLocaleString()} review{count === 1 ? '' : 's'}
              {summary.verifiedCount ? ` · ${summary.verifiedCount} from buyers the seller replied to` : ''}
            </p>
            <p className="ws-caption ws-subtle">Only buyers who messaged this seller can leave a review.</p>

            <div className="ws-reviews__bars ws-storereviews__bars">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = summary.distribution[String(star) as '1'] ?? 0;
                return (
                  <div key={star} className="ws-reviews__bar">
                    <span>{star}</span>
                    <div className="ws-reviews__bartrack">
                      <div className="ws-reviews__barfill" style={{ width: `${(n / count) * 100}%` }} />
                    </div>
                    <span>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className={`ws-storereviews__list${query.isPlaceholderData ? ' ws-busy' : ''}`}>
              {reviews.map((r) => (
                <article key={r.id} className="ws-storereview">
                  <div className="ws-review__head">
                    <Stars value={r.rating} size={13} />
                    <span className="ws-review__date">{formatDate(r.createdAt)}</span>
                  </div>

                  {r.title && <h3 className="ws-storereview__title">{r.title}</h3>}
                  <p className="ws-storereview__body">{r.comment}</p>

                  {r.vendorReply && (
                    <div className="ws-review__reply">
                      <div className="ws-caption" style={{ fontWeight: 600 }}>Seller replied</div>
                      <p className="ws-caption ws-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>
                        {r.vendorReply}
                      </p>
                    </div>
                  )}

                  <footer className="ws-storereview__foot">
                    <strong>{r.userName}</strong>
                    {r.isVerified && (
                      <span className="ws-storereview__verified" title="This buyer messaged the seller and got a reply">
                        <BadgeCheck size={12} aria-hidden />
                        Got a reply
                      </span>
                    )}
                    {r.product && (
                      <Link to={`/listings/${r.product.slug}`} className="ws-storereview__item">
                        on {r.product.name}
                      </Link>
                    )}
                  </footer>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="ws-pager" aria-label="Review pages">
                <button
                  type="button"
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="ws-pager__status">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
