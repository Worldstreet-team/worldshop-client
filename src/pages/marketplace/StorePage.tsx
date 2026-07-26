import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicMarketplace, type PublicStore, type Listing } from '@/services/storeService';
import SellerCard from '@/components/marketplace/SellerCard';
import ListingCard from '@/components/marketplace/ListingCard';
import ReportButton from '@/components/marketplace/ReportButton';

/**
 * Public storefront.
 *
 * A store page is a seller's shopfront and their reputation in one: the
 * catalogue answers "do they have what I want", the seller card answers "can I
 * trust them and will they reply". Both are needed before someone will make
 * contact, so neither is behind a tab.
 */

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    publicMarketplace
      .getStore(slug)
      .then((res) => {
        if (!cancelled) setStore(res.data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    publicMarketplace
      .getStoreListings(slug, { page, limit: 24 })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  if (notFound) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1>Store not available</h1>
        <p style={{ color: '#667085', marginBottom: '1rem' }}>
          This store may have closed, or its subscription is not currently active.
        </p>
        <Link to="/listings" className="btn-primary">Browse the marketplace</Link>
      </div>
    );
  }

  if (!store) return <div className="container"><p style={{ color: '#667085', padding: '2rem 0' }}>Loading…</p></div>;

  return (
    <div className="container store-page" style={{ padding: '1.5rem 0' }}>
      {store.banner && (
        <img
          src={store.banner}
          alt=""
          style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: '1rem' }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(260px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{store.name}</h1>
          <div style={{ color: '#667085', marginBottom: '0.75rem' }}>
            {[store.city, store.state].filter(Boolean).join(', ')}
          </div>

          {store.description && (
            <p style={{ color: '#344054', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{store.description}</p>
          )}

          <h2 style={{ fontSize: '1.15rem', marginTop: '1.5rem' }}>
            Listings {total > 0 && <span style={{ color: '#667085', fontWeight: 400 }}>({total})</span>}
          </h2>

          {loading ? (
            <p style={{ color: '#667085' }}>Loading listings…</p>
          ) : listings.length === 0 ? (
            <p style={{ color: '#667085' }}>This seller has no live listings right now.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span style={{ color: '#667085' }}>Page {page} of {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: '1rem' }}>
          <SellerCard store={store} />

          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <ReportButton
              targetType="STORE"
              targetId={store.id}
              targetName={store.name}
              label="Report this store"
            />
          </div>

          {(store.phone || store.whatsapp || store.website || store.address) && (
            <div style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: '1rem' }}>Contact</h3>
              <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.88rem' }}>
                {store.phone && <a href={`tel:${store.phone}`}>{store.phone}</a>}
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                )}
                {store.website && (
                  <a href={store.website} target="_blank" rel="noopener noreferrer">Website</a>
                )}
                {store.address && <div style={{ color: '#667085' }}>{store.address}</div>}
              </div>

              <p style={{ fontSize: '0.78rem', color: '#98a2b3', marginTop: '0.75rem', lineHeight: 1.4 }}>
                WorldStreet does not handle payment or delivery. Check items before paying.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
