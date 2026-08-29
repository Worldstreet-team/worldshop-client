import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Copy } from 'lucide-react';
import { storeService, type MyStore } from '@/services/storeService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Store profile settings.
 *
 * Replaces the ecommerce version, which edited the vendor fields on
 * UserProfile and a bank withdrawal account — both features that no longer
 * exist. Everything here is what buyers see: identity, branding, contact
 * channels and location. There is nothing financial on this page; the
 * subscription lives on the dashboard.
 *
 * One rule carried through the whole form: an emptied field is sent as null
 * (clear it), a filled one as its value — the payload is the full form state.
 * The only dangerous control is `regenerateSlug`, so it is opt-in per save and
 * worded as the link-breaking action it is.
 */

/**
 * Field-level validation errors are more specific than the envelope message
 * ("Validation failed"), so prefer the first one when present.
 */
const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

/** "" in a text input means the vendor cleared it — send null, not "". */
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Same pattern Registration enforces when a store is first created — kept in
 * sync so a number rejected there can't be saved unchecked here later. */
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export default function VendorSettings() {
  const addToast = useUIStore((s) => s.addToast);

  const [store, setStore] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──
  const [name, setName] = useState('');
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const [description, setDescription] = useState('');
  // Value/preview pairs: the value is what gets saved (a bare R2 key from a
  // fresh upload, or whatever the server sent back), the preview is always a
  // displayable URL. A presigned URL expires and is too long to persist, so
  // it must never be the saved value when a key is available.
  const [logo, setLogo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    let cancelled = false;

    storeService
      .getMyStore()
      .then((res) => {
        if (cancelled) return;
        const s = res.data;
        setStore(s);
        setName(s.name);
        setDescription(s.description ?? '');
        // The server signs stored keys into display URLs on read; use them for
        // both value and preview — the server collapses URLs back to keys on save.
        setLogo(s.logo ?? null);
        setLogoPreview(s.logo ?? null);
        setBanner(s.banner ?? null);
        setBannerPreview(s.banner ?? null);
        setPhone(s.phone ?? '');
        setWhatsapp(s.whatsapp ?? '');
        setEmail(s.email ?? '');
        setWebsite(s.website ?? '');
        setState(s.state ?? '');
        setCity(s.city ?? '');
        setAddress(s.address ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errMessage(err, 'Could not load your store'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const publicUrl = store ? `${window.location.origin}/stores/${store.slug}` : '';
  const nameChanged = store != null && name.trim() !== store.name;

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const uploadImage = async (kind: 'logo' | 'banner', files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(kind);
    try {
      const res = await storeService.uploadBranding(files[0]);
      const uploaded = res.data[0];
      // Persist the stable key; show the signed URL (falls back to the key
      // for old servers that only returned one of the two).
      const value = String(uploaded.key || uploaded.cloudflareId || uploaded.url || '');
      const preview = String(uploaded.url || uploaded.key || '');
      if (kind === 'logo') {
        setLogo(value);
        setLogoPreview(preview);
      } else {
        setBanner(value);
        setBannerPreview(preview);
      }
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Image upload failed') });
    } finally {
      setUploading(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError('Store name must be at least 3 characters.');
      return;
    }
    if (!state) {
      setError('Choose the state you operate from — buyers browse by it.');
      return;
    }
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      setError('Enter a valid phone number.');
      return;
    }
    if (whatsapp.trim() && !PHONE_RE.test(whatsapp.trim())) {
      setError('Enter a valid WhatsApp number.');
      return;
    }

    setSaving(true);
    try {
      const res = await storeService.updateStore({
        name: name.trim(),
        description: orNull(description),
        logo,
        banner,
        phone: orNull(phone),
        whatsapp: orNull(whatsapp),
        email: orNull(email),
        website: orNull(website),
        state,
        city: orNull(city),
        address: orNull(address),
        // Only meaningful alongside a rename, and disarmed after every save so
        // it cannot linger across later edits.
        ...(regenerateSlug && nameChanged ? { regenerateSlug: true } : {}),
      });
      setStore(res.data);
      setRegenerateSlug(false);
      addToast({ type: 'success', message: 'Store profile saved' });
    } catch (err: unknown) {
      setError(errMessage(err, 'Could not save your store profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Store Settings</h1></div>
        <div className="ws-skeleton" style={{ height: 400, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Store Settings</h1></div>
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error ?? 'Could not load your store.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page" style={{ maxWidth: 860 }}>
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Store Settings</h1>
          <p className="ws-page__sub">
            Everything on this page is what buyers see. Your subscription is
            managed from the{' '}
            <Link to="/vendor" style={{ color: 'var(--ws-brand-gold-text)' }}>dashboard</Link>.
          </p>
        </div>
      </div>

      <div className="ws-stack--lg">
        {/* ── Store URL ── */}
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
            {store.isPubliclyVisible ? (
              <Link to={`/stores/${store.slug}`} className="ws-btn ws-btn--sm ws-btn--secondary">
                View public page
              </Link>
            ) : (
              <span className="ws-caption" style={{ color: 'var(--ws-status-warning)' }}>
                Not visible to buyers yet — activate from the dashboard.
              </span>
            )}
          </div>
        </section>

        {error && (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={save} className="ws-stack--lg">
          {/* ── Identity ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Identity</h2>

            <div className="ws-formfield">
              <label htmlFor="name" className="ws-formfield__label">Store Name *</label>
              <input id="name" className="ws-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>

            {/* The one link-breaking control on the page, armed per save. */}
            {nameChanged && (
              <label className="ws-check">
                <input
                  type="checkbox"
                  className="ws-check__input"
                  checked={regenerateSlug}
                  onChange={(e) => setRegenerateSlug(e.target.checked)}
                />
                <span className="ws-check__body">
                  <span className="ws-check__label">Also update my store link to match the new name.</span>
                  <span className="ws-check__desc" style={{ color: 'var(--ws-status-warning)' }}>
                    This changes your URL — anywhere you have shared the old link will stop working.
                  </span>
                </span>
              </label>
            )}

            <div className="ws-formfield">
              <label htmlFor="description" className="ws-formfield__label">About Your Store</label>
              <textarea
                id="description"
                className="ws-textarea"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What do you sell? Why should a buyer contact you?"
              />
            </div>
          </section>

          {/* ── Branding ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Branding</h2>

            <div style={{ display: 'flex', gap: 'var(--ws-space-8)', flexWrap: 'wrap' }}>
              <div className="ws-formfield">
                <span className="ws-formfield__label">Logo</span>
                {logo ? (
                  <div style={{ display: 'flex', gap: 'var(--ws-space-2)', alignItems: 'center' }}>
                    <img
                      src={logoPreview ?? logo}
                      alt=""
                      style={{
                        width: 64, height: 64, borderRadius: 'var(--ws-radius-pill)',
                        objectFit: 'cover', border: '1px solid var(--ws-border-hairline)',
                      }}
                    />
                    <button
                      type="button"
                      className="ws-btn ws-btn--sm ws-btn--ghost"
                      onClick={() => { setLogo(null); setLogoPreview(null); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    className="ws-file"
                    disabled={uploading === 'logo'}
                    onChange={(e) => uploadImage('logo', e.target.files)}
                  />
                )}
                {uploading === 'logo' && <p className="ws-caption ws-muted">Uploading…</p>}
              </div>

              <div className="ws-formfield" style={{ flex: 1, minWidth: 260 }}>
                <span className="ws-formfield__label">Banner</span>
                {banner ? (
                  <div>
                    <img
                      src={bannerPreview ?? banner}
                      alt=""
                      style={{
                        width: '100%', maxWidth: 420, height: 90, objectFit: 'cover',
                        borderRadius: 'var(--ws-radius-lg)', border: '1px solid var(--ws-border-hairline)',
                      }}
                    />
                    <div>
                      <button
                        type="button"
                        className="ws-btn ws-btn--sm ws-btn--ghost"
                        onClick={() => { setBanner(null); setBannerPreview(null); }}
                        style={{ marginTop: 'var(--ws-space-2)' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    className="ws-file"
                    disabled={uploading === 'banner'}
                    onChange={(e) => uploadImage('banner', e.target.files)}
                  />
                )}
                {uploading === 'banner' && <p className="ws-caption ws-muted">Uploading…</p>}
              </div>
            </div>
          </section>

          {/* ── Contact ── */}
          <section className="ws-card ws-stack--lg">
            <div>
              <h2 className="ws-h2">Contact</h2>
              <p className="ws-caption ws-muted">
                Shown on your store page and listings. Buyers message you on
                WorldStreet first; these let them also reach you directly. Clearing
                a field removes it from your page.
              </p>
            </div>

            <div className="ws-formgrid">
              <div className="ws-formfield">
                <label htmlFor="phone" className="ws-formfield__label">Phone Number</label>
                <input id="phone" type="tel" className="ws-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08031234567" />
              </div>

              <div className="ws-formfield">
                <label htmlFor="whatsapp" className="ws-formfield__label">WhatsApp Number</label>
                <input id="whatsapp" type="tel" className="ws-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="If different from your phone number" />
              </div>

              <div className="ws-formfield">
                <label htmlFor="email" className="ws-formfield__label">Contact Email</label>
                <input id="email" type="email" className="ws-field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="ws-formfield">
                <label htmlFor="website" className="ws-formfield__label">Website or Social Page</label>
                <input id="website" type="url" className="ws-field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://instagram.com/yourstore" />
              </div>
            </div>
          </section>

          {/* ── Location ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Location</h2>

            <div className="ws-formgrid">
              <div className="ws-formfield">
                <label htmlFor="state" className="ws-formfield__label">State *</label>
                <select id="state" className="ws-select" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">Select a state</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="ws-formfield">
                <label htmlFor="city" className="ws-formfield__label">City / Area</label>
                <input id="city" className="ws-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />
              </div>

              <div className="ws-formfield ws-formgrid__full">
                <label htmlFor="address" className="ws-formfield__label">Shop Address</label>
                <input id="address" className="ws-field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shown to buyers if you have a physical shop" />
              </div>
            </div>
          </section>

          <div>
            <button type="submit" className="ws-btn ws-btn--primary" disabled={saving || uploading != null}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
