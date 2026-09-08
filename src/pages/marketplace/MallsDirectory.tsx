import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, MapPin, Store } from 'lucide-react';
import { publicMalls, type PublicMall } from '@/services/mallService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import MallCallout from '@/components/marketplace/MallCallout';

/**
 * Public mall directory. Mirrors the store directory's shape: state filter,
 * card grid, pagination. A mall card sells the destination — banner, name,
 * location, how many stores are inside.
 */

function MallCard({ mall }: { mall: PublicMall }) {
  const location = [mall.city, mall.state].filter(Boolean).join(', ');

  return (
    <Link to={`/malls/${mall.slug}`} className="ws-storecard">
      <div className="ws-storecard__banner" aria-hidden>
        {mall.banner ? <img src={mall.banner} alt="" loading="lazy" /> : <Building2 size={22} />}
      </div>

      <div className="ws-storecard__body">
        <span className="ws-avatar ws-avatar--l ws-storecard__logo" aria-hidden>
          {mall.logo ? <img src={mall.logo} alt="" /> : mall.name.charAt(0).toUpperCase()}
        </span>

        <h3 className="ws-storecard__name">{mall.name}</h3>
        {location && (
          <p className="ws-storecard__loc">
            <MapPin size={12} aria-hidden style={{ verticalAlign: -1, marginRight: 4 }} />
            {location}
          </p>
        )}

        <p className="ws-storecard__stats ws-num">
          <Store size={13} aria-hidden />
          {mall.substoreCount} store{mall.substoreCount === 1 ? '' : 's'}
        </p>

        <span className="ws-storecard__cta">
          Visit mall
          <ArrowRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function MallsDirectory() {
  const [malls, setMalls] = useState<PublicMall[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    publicMalls
      .browse({ page, limit: 24, ...(state ? { state } : {}) })
      .then((res) => {
        if (cancelled) return;
        setMalls(res.data);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => {
        if (!cancelled) setMalls([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, state]);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Malls</h1>
          <p className="ws-page__sub">Shopping destinations with multiple stores under one roof.</p>
        </div>
        <select
          className="ws-select"
          style={{ maxWidth: 220 }}
          value={state}
          onChange={(e) => {
            setPage(1);
            setState(e.target.value);
          }}
          aria-label="Filter malls by state"
        >
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <MallCallout />

      {loading ? (
        <div
          style={{
            display: 'grid', gap: 'var(--ws-space-4)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ws-skeleton" style={{ height: 220, borderRadius: 'var(--ws-radius-xl)' }} />
          ))}
        </div>
      ) : malls.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Building2 size={26} aria-hidden /></div>
          <h2 className="ws-title">No malls yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            {state
              ? `No malls in ${state} yet — try another state.`
              : 'Be the first — a mall gives your storefronts a shared home here.'}
          </p>
          {!state && (
            <Link to="/mall/register" className="ws-btn ws-btn--sm ws-btn--primary">
              Create your mall
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid', gap: 'var(--ws-space-4)',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {malls.map((m) => (
              <MallCard key={m.id} mall={m} />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)',
                marginTop: 'var(--ws-space-6)',
              }}
            >
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="ws-caption ws-muted ws-num" style={{ alignSelf: 'center' }}>
                Page {page} of {totalPages}
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
        </>
      )}
    </div>
  );
}
