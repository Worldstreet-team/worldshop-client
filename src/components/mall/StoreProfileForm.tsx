import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { type UpdateStorePayload, type UploadedImage } from '@/services/storeService';
import { DEFAULT_COUNTRY } from '@/utils/locations';
import CountrySelect from '@/components/location/CountrySelect';
import StateSelect from '@/components/location/StateSelect';
import { toApiError } from '@/services/api';

/**
 * The editable profile of a mall or a substore.
 *
 * Both are the same shape — identity, branding, contact, location — and both
 * PATCH the same field set, so they share one form rather than two near-copies
 * that drift. The personal-store version (vendor/Settings.tsx) is deliberately
 * left alone: it is the older, load-bearing page, and folding it in here would
 * risk it for no benefit to this change.
 *
 * One rule carried through, matching vendor/Settings: an emptied field is sent
 * as null (clear it), a filled one as its value. The payload is the whole form
 * state, so a PATCH always describes the complete profile.
 */

export interface ProfileValues {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  country?: string;
  state?: string;
  city?: string | null;
  address?: string | null;
}

interface Props {
  /** "Mall" or "Store" — used in labels and the slug warning. */
  noun: string;
  initial: ProfileValues;
  /** Public path prefix for the entity, e.g. "/malls" or "/stores". */
  publicPathPrefix: string;
  onSave: (payload: UpdateStorePayload) => Promise<void>;
  uploadImage: (file: File) => Promise<UploadedImage>;
  /**
   * A substore may inherit its mall's location, so State is not required
   * there; a mall must have one, since buyers browse malls by state.
   */
  requireState?: boolean;
}

/** Field-level errors are more specific than the envelope's "Validation failed". */
const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

/** "" means the owner cleared the field — send null, not "". */
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Kept in sync with the server's mall.validator contact schema. */
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export default function StoreProfileForm({
  noun,
  initial,
  publicPathPrefix,
  onSave,
  uploadImage,
  requireState = true,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const [description, setDescription] = useState(initial.description ?? '');
  // Value/preview pairs: the value is what gets saved (a bare R2 key from a
  // fresh upload, or whatever the server sent back), the preview is always
  // displayable. A presigned URL expires, so it must never be the saved value.
  const [logo, setLogo] = useState<string | null>(initial.logo ?? null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo ?? null);
  const [banner, setBanner] = useState<string | null>(initial.banner ?? null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initial.banner ?? null);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');
  // A substore may leave both blank to sit where its mall sits.
  const [country, setCountry] = useState(initial.country ?? (requireState ? DEFAULT_COUNTRY : ''));
  const [state, setState] = useState(initial.state ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [address, setAddress] = useState(initial.address ?? '');

  const nameChanged = name.trim() !== initial.name;

  const handleUpload = async (kind: 'logo' | 'banner', files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(kind);
    try {
      const uploaded = await uploadImage(files[0]);
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
      setError(errMessage(err, 'Image upload failed'));
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError(`${noun} name must be at least 3 characters.`);
      return;
    }
    if (requireState && !country) {
      setError('Choose the country you operate from — buyers browse by it.');
      return;
    }
    if ((requireState || country) && !state.trim()) {
      setError('Choose the state or region you operate from — buyers browse by it.');
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
      await onSave({
        name: name.trim(),
        description: orNull(description),
        logo,
        banner,
        phone: orNull(phone),
        whatsapp: orNull(whatsapp),
        email: orNull(email),
        website: orNull(website),
        // The server rejects an empty state; omit it rather than send "" when
        // a substore is inheriting its mall's location.
        ...(country ? { country } : {}),
        ...(state.trim() ? { state: state.trim() } : {}),
        city: orNull(city),
        address: orNull(address),
        // Only meaningful alongside a rename, and disarmed after every save so
        // it cannot linger into a later edit.
        ...(regenerateSlug && nameChanged ? { regenerateSlug: true } : {}),
      });
      setRegenerateSlug(false);
    } catch (err: unknown) {
      setError(errMessage(err, `Could not save your ${noun.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="ws-stack--lg">
      {error && (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* ── Identity ── */}
      <section className="ws-card ws-stack--lg">
        <h2 className="ws-h2">Identity</h2>

        <div className="ws-formfield">
          <label htmlFor="sp-name" className="ws-formfield__label">{noun} Name *</label>
          <input
            id="sp-name"
            className="ws-field"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
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
              <span className="ws-check__label">
                Also update the link ({publicPathPrefix}/{initial.slug}) to match the new name.
              </span>
              <span className="ws-check__desc" style={{ color: 'var(--ws-status-warning)' }}>
                This changes the URL — anywhere the old link was shared will stop working.
              </span>
            </span>
          </label>
        )}

        <div className="ws-formfield">
          <label htmlFor="sp-description" className="ws-formfield__label">Description</label>
          <textarea
            id="sp-description"
            className="ws-textarea"
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is sold here? Why should a buyer get in touch?"
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
                onChange={(e) => handleUpload('logo', e.target.files)}
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
                onChange={(e) => handleUpload('banner', e.target.files)}
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
            Shown on the public page. Buyers message you on WorldStore first;
            these let them also reach you directly. Clearing a field removes it.
          </p>
        </div>

        <div className="ws-formgrid">
          <div className="ws-formfield">
            <label htmlFor="sp-phone" className="ws-formfield__label">Phone Number</label>
            <input id="sp-phone" type="tel" className="ws-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08031234567" />
          </div>

          <div className="ws-formfield">
            <label htmlFor="sp-whatsapp" className="ws-formfield__label">WhatsApp Number</label>
            <input id="sp-whatsapp" type="tel" className="ws-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="If different from your phone number" />
          </div>

          <div className="ws-formfield">
            <label htmlFor="sp-email" className="ws-formfield__label">Contact Email</label>
            <input id="sp-email" type="email" className="ws-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="ws-formfield">
            <label htmlFor="sp-website" className="ws-formfield__label">Website or Social Page</label>
            <input id="sp-website" type="url" className="ws-field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://instagram.com/yourstore" />
          </div>
        </div>
      </section>

      {/* ── Location ── */}
      <section className="ws-card ws-stack--lg">
        <h2 className="ws-h2">Location</h2>

        <div className="ws-formgrid">
          <div className="ws-formfield">
            <label htmlFor="sp-country" className="ws-formfield__label">
              Country {requireState ? '*' : ''}
            </label>
            <CountrySelect
              id="sp-country"
              value={country}
              placeholder={requireState ? undefined : 'Same as the mall'}
              onChange={(e) => { setCountry(e.target.value); setState(''); }}
            />
          </div>

          <div className="ws-formfield">
            <label htmlFor="sp-state" className="ws-formfield__label">
              State / Region {requireState ? '*' : ''}
            </label>
            <StateSelect
              id="sp-state"
              country={country}
              value={state}
              placeholder={requireState ? undefined : 'Same as the mall'}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          <div className="ws-formfield">
            <label htmlFor="sp-city" className="ws-formfield__label">City / Area</label>
            <input id="sp-city" className="ws-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />
          </div>

          <div className="ws-formfield ws-formgrid__full">
            <label htmlFor="sp-address" className="ws-formfield__label">Address</label>
            <input id="sp-address" className="ws-field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shown to buyers if there is a physical shop" />
          </div>
        </div>
      </section>

      <div>
        <button type="submit" className="ws-btn ws-btn--primary" disabled={saving || uploading != null}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
