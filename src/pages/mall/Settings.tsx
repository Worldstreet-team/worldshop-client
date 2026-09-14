import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Copy } from 'lucide-react';
import { mallService, type MyMall } from '@/services/mallService';
import StoreProfileForm from '@/components/mall/StoreProfileForm';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Mall profile settings. The server has always accepted PATCH /malls/me;
 * until now nothing in the UI called it, so a mall's name, branding, contact
 * details and location were fixed at creation.
 *
 * The subscription is not here — it lives on the dashboard, same split as the
 * personal store.
 */
export default function MallSettings() {
  const addToast = useUIStore((s) => s.addToast);

  const [mall, setMall] = useState<MyMall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    mallService
      .getMyMall()
      .then((res) => {
        if (!cancelled) setMall(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toApiError(err, 'Could not load your mall').message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const publicUrl = mall ? `${window.location.origin}/malls/${mall.slug}` : '';

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Mall Settings</h1></div>
        <div className="ws-skeleton" style={{ height: 400, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  if (!mall) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Mall Settings</h1></div>
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error ?? 'Could not load your mall.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page" style={{ maxWidth: 860 }}>
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Mall Settings</h1>
          <p className="ws-page__sub">
            Everything here is what buyers see on your mall page. Your
            subscription is managed from the{' '}
            <Link to="/mall" style={{ color: 'var(--ws-brand-gold-text)' }}>dashboard</Link>.
          </p>
        </div>
      </div>

      <div className="ws-stack--lg">
        <section className="ws-card">
          <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-3)' }}>Mall link</h2>
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
            {mall.isPubliclyVisible ? (
              <Link to={`/malls/${mall.slug}`} className="ws-btn ws-btn--sm ws-btn--secondary">
                View public page
              </Link>
            ) : (
              <span className="ws-caption" style={{ color: 'var(--ws-status-warning)' }}>
                Not visible to buyers yet — activate from the dashboard.
              </span>
            )}
          </div>
        </section>

        <StoreProfileForm
          noun="Mall"
          publicPathPrefix="/malls"
          initial={mall}
          uploadImage={(file) => mallService.uploadBranding(file).then((res) => res.data[0])}
          onSave={async (payload) => {
            const res = await mallService.updateMall(payload);
            setMall(res.data);
            addToast({ type: 'success', message: 'Mall profile saved' });
          }}
        />
      </div>
    </div>
  );
}
