import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storeService, type MyStore } from '@/services/storeService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { useUIStore } from '@/store/uiStore';

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

type ApiError = { response?: { data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;

/** "" in a text input means the vendor cleared it — send null, not "". */
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

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
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
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
        setLogo(s.logo ?? null);
        setBanner(s.banner ?? null);
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
      const src = String(uploaded.url || uploaded.key || '');
      if (kind === 'logo') setLogo(src);
      else setBanner(src);
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
    return <div className="vendor-settings"><p style={{ color: '#667085' }}>Loading store…</p></div>;
  }

  if (!store) {
    return (
      <div className="vendor-settings">
        <div className="page-header"><h1>Store Settings</h1></div>
        <p style={{ color: '#b42318' }}>{error ?? 'Could not load your store.'}</p>
      </div>
    );
  }

  return (
    <div className="vendor-settings">
      <div className="page-header">
        <h1>Store Settings</h1>
        <p style={{ color: '#667085' }}>
          Everything on this page is what buyers see. Your subscription is
          managed from the <Link to="/vendor">dashboard</Link>.
        </p>
      </div>

      {/* ── Store URL ── */}
      <section className="dashboard-section">
        <h2>Store link</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ background: '#f8f9fc', border: '1px solid #e4e7ec', borderRadius: 6, padding: '0.45rem 0.7rem' }}>
            {publicUrl}
          </code>
          <button type="button" className="btn-secondary" onClick={copyUrl}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          {store.isPubliclyVisible ? (
            <Link to={`/stores/${store.slug}`} className="btn-secondary">View public page</Link>
          ) : (
            <span style={{ color: '#b54708', fontSize: '0.85rem' }}>
              Not visible to buyers yet — activate from the dashboard.
            </span>
          )}
        </div>
      </section>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={save}>
        {/* ── Identity ── */}
        <section className="dashboard-section">
          <h2>Identity</h2>

          <div className="form-group">
            <label htmlFor="name">Store Name *</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>

          {/* The one link-breaking control on the page, armed per save. */}
          {nameChanged && (
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', margin: '-0.25rem 0 0.75rem', fontSize: '0.88rem', color: '#475467' }}>
              <input
                type="checkbox"
                checked={regenerateSlug}
                onChange={(e) => setRegenerateSlug(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Also update my store link to match the new name.
                <br />
                <span style={{ color: '#b54708' }}>
                  This changes your URL — anywhere you have shared the old link will stop working.
                </span>
              </span>
            </label>
          )}

          <div className="form-group">
            <label htmlFor="description">About Your Store</label>
            <textarea
              id="description"
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you sell? Why should a buyer contact you?"
            />
          </div>
        </section>

        {/* ── Branding ── */}
        <section className="dashboard-section">
          <h2>Branding</h2>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem' }}>Logo</label>
              {logo ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <img src={logo} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e4e7ec' }} />
                  <button type="button" className="btn-secondary" onClick={() => setLogo(null)}>Remove</button>
                </div>
              ) : (
                <input type="file" accept="image/*" disabled={uploading === 'logo'} onChange={(e) => uploadImage('logo', e.target.files)} />
              )}
              {uploading === 'logo' && <p style={{ color: '#667085', fontSize: '0.85rem' }}>Uploading…</p>}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={{ display: 'block', marginBottom: '0.35rem' }}>Banner</label>
              {banner ? (
                <div>
                  <img src={banner} alt="" style={{ width: '100%', maxWidth: 420, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e4e7ec' }} />
                  <div>
                    <button type="button" className="btn-secondary" onClick={() => setBanner(null)} style={{ marginTop: '0.4rem' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <input type="file" accept="image/*" disabled={uploading === 'banner'} onChange={(e) => uploadImage('banner', e.target.files)} />
              )}
              {uploading === 'banner' && <p style={{ color: '#667085', fontSize: '0.85rem' }}>Uploading…</p>}
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="dashboard-section">
          <h2>Contact</h2>
          <p style={{ color: '#667085', fontSize: '0.88rem' }}>
            Shown on your store page and listings. Buyers message you on
            WorldStreet first; these let them also reach you directly. Clearing
            a field removes it from your page.
          </p>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08031234567" />
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp">WhatsApp Number</label>
            <input id="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="If different from your phone number" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Contact Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website or Social Page</label>
            <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://instagram.com/yourstore" />
          </div>
        </section>

        {/* ── Location ── */}
        <section className="dashboard-section">
          <h2>Location</h2>

          <div className="form-group">
            <label htmlFor="state">State *</label>
            <select id="state" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">City / Area</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />
          </div>

          <div className="form-group">
            <label htmlFor="address">Shop Address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shown to buyers if you have a physical shop" />
          </div>
        </section>

        <button type="submit" className="btn-primary" disabled={saving || uploading != null}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
