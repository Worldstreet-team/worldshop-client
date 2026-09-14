import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import { mallService, type Substore } from '@/services/mallService';
import StoreProfileForm from '@/components/mall/StoreProfileForm';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Substore profile settings. PATCH /malls/me/substores/:id has always
 * existed; nothing called it, so a substore was fixed at whatever the
 * lightweight create form captured (name, state, city, description).
 *
 * State is optional here, unlike a mall: a substore with no state of its own
 * inherits its mall's location.
 */
export default function SubstoreEdit() {
  const { substoreId } = useParams<{ substoreId: string }>();
  const addToast = useUIStore((s) => s.addToast);

  const [substore, setSubstore] = useState<Substore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!substoreId) return;
    let cancelled = false;

    mallService
      .getSubstore(substoreId)
      .then((res) => {
        if (!cancelled) setSubstore(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toApiError(err, 'Could not load this store').message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [substoreId]);

  const publicUrl = substore ? `${window.location.origin}/stores/${substore.slug}` : '';

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const backLink = (
    <Link
      to="/mall/stores"
      className="ws-btn ws-btn--sm ws-btn--ghost"
      style={{ marginBottom: 'var(--ws-space-2)', marginLeft: -8 }}
    >
      <ArrowLeft size={14} aria-hidden />
      Stores
    </Link>
  );

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head">
          <div>
            {backLink}
            <h1 className="ws-page__title">Store Settings</h1>
          </div>
        </div>
        <div className="ws-skeleton" style={{ height: 400, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  if (!substore) {
    return (
      <div className="ws-page">
        <div className="ws-page__head">
          <div>
            {backLink}
            <h1 className="ws-page__title">Store Settings</h1>
          </div>
        </div>
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error ?? 'Could not load this store.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page" style={{ maxWidth: 860 }}>
      <div className="ws-page__head">
        <div>
          {backLink}
          <h1 className="ws-page__title">{substore.name}</h1>
          <p className="ws-page__sub">
            This store's public profile. Its listings are managed{' '}
            <Link
              to={`/mall/stores/${substore.id}/products`}
              style={{ color: 'var(--ws-brand-gold-text)' }}
            >
              separately
            </Link>.
          </p>
        </div>
      </div>

      <div className="ws-stack--lg">
        <section className="ws-card">
          <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-3)' }}>Store link</h2>
          <div style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                background: 'var(--ws-bg-sunken)',
                border: '1px solid var(--ws-border-hairline)',
                borderRadius: 'var(--ws-radius-md)',
                padding: '8px 11px',
                fontSize: 13,
              }}
            >
              {publicUrl}
            </code>
            <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={copyUrl}>
              <Copy size={14} aria-hidden />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <Link to={`/stores/${substore.slug}`} className="ws-btn ws-btn--sm ws-btn--secondary">
              View public page
            </Link>
          </div>
        </section>

        <StoreProfileForm
          noun="Store"
          publicPathPrefix="/stores"
          initial={substore}
          requireState={false}
          uploadImage={(file) => mallService.uploadBranding(file).then((res) => res.data[0])}
          onSave={async (payload) => {
            const res = await mallService.updateSubstore(substore.id, payload);
            setSubstore(res.data);
            addToast({ type: 'success', message: 'Store saved' });
          }}
        />
      </div>
    </div>
  );
}
