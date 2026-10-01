import { useState, useEffect, useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Copy, ExternalLink, ImagePlus } from 'lucide-react';
import { storeService, type MyStore } from '@/features/stores/api';
import { VendorPage, VendorPageHead, VendorSectionHead } from '@/features/stores/components/vendor/VendorPage';
import { DEFAULT_COUNTRY } from '@/shared/utils/locations';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';
import { queryKeys } from '@/shared/lib/queryKeys';

/**
 * Shop settings, laid out as the sandbox's: titled sections of bordered
 * field groups, and a sticky bar that says whether anything is unsaved.
 *
 * Everything here is what buyers see: identity, location, contact channels
 * and branding. There is nothing financial on this page; the subscription
 * lives on the Overview. The sandbox's fulfilment defaults and notification
 * toggles are not here: the API stores neither.
 *
 * One rule carried through the whole form: an emptied field is sent as null
 * (clear it), a filled one as its value; the payload is the full form state.
 * The only dangerous control is `regenerateSlug`, so it is opt-in per save and
 * worded as the link-breaking action it is.
 */

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

/** "" in a text input means the vendor cleared it: send null, not "". */
const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Same pattern Registration enforces when a store is first created, kept in
 * sync so a number rejected there cannot be saved unchecked here later. */
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

const BIO_MAX = 1000;

type Form = {
  name: string;
  description: string;
  // The value saved: a bare storage key from a fresh upload, or whatever the
  // server sent back. The preview is held apart, since a presigned URL
  // expires and must never be the saved value when a key is available.
  logo: string | null;
  banner: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  country: string;
  state: string;
  city: string;
  address: string;
};

const fromStore = (s: MyStore): Form => ({
  name: s.name,
  description: s.description ?? '',
  logo: s.logo ?? null,
  banner: s.banner ?? null,
  phone: s.phone ?? '',
  whatsapp: s.whatsapp ?? '',
  email: s.email ?? '',
  website: s.website ?? '',
  country: s.country ?? DEFAULT_COUNTRY,
  state: s.state ?? '',
  city: s.city ?? '',
  address: s.address ?? '',
});

function Field({
  label,
  required,
  counter,
  wide,
  children,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  counter?: string;
  wide?: boolean;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={`ws-vxfieldset${wide ? ' is-wide' : ''}`}>
      <div className="ws-vxfieldset__top">
        <label htmlFor={htmlFor} className="ws-vxlabel">
          {label}
          {required && <span aria-hidden className="ws-vxlabel__req">*</span>}
        </label>
        {counter && <span className="ws-vxfieldset__count ws-num">{counter}</span>}
      </div>
      {children}
    </div>
  );
}

export default function VendorSettings() {
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const id = useId();

  const [store, setStore] = useState<MyStore | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [previews, setPreviews] = useState<{ logo: string | null; banner: string | null }>({ logo: null, banner: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    storeService
      .getMyStore()
      .then((res) => {
        if (cancelled) return;
        setStore(res.data);
        setForm(fromStore(res.data));
        // The server signs stored keys into display URLs on read; use them for
        // both value and preview. It collapses URLs back to keys on save.
        setPreviews({ logo: res.data.logo ?? null, banner: res.data.banner ?? null });
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

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const publicUrl = store ? `${window.location.origin}/stores/${store.slug}` : '';
  const nameChanged = store != null && form != null && form.name.trim() !== store.name;
  const dirty = store != null && form != null && JSON.stringify(form) !== JSON.stringify(fromStore(store));

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
      set(kind, value);
      setPreviews((p) => ({ ...p, [kind]: preview }));
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Image upload failed') });
    } finally {
      setUploading(null);
    }
  };

  const discard = () => {
    if (!store) return;
    setForm(fromStore(store));
    setPreviews({ logo: store.logo ?? null, banner: store.banner ?? null });
    setRegenerateSlug(false);
    setError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError(null);

    if (form.name.trim().length < 3) return setError('Store name must be at least 3 characters.');
    if (!form.country) return setError('Choose the country you operate from. Buyers browse by it.');
    if (!form.state.trim()) return setError('Choose the state or region you operate from. Buyers browse by it.');
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) return setError('Enter a valid phone number.');
    if (form.whatsapp.trim() && !PHONE_RE.test(form.whatsapp.trim())) return setError('Enter a valid WhatsApp number.');

    setSaving(true);
    try {
      const res = await storeService.updateStore({
        name: form.name.trim(),
        description: orNull(form.description),
        logo: form.logo,
        banner: form.banner,
        phone: orNull(form.phone),
        whatsapp: orNull(form.whatsapp),
        email: orNull(form.email),
        website: orNull(form.website),
        country: form.country,
        state: form.state.trim(),
        city: orNull(form.city),
        address: orNull(form.address),
        // Only meaningful alongside a rename, and disarmed after every save so
        // it cannot linger across later edits.
        ...(regenerateSlug && nameChanged ? { regenerateSlug: true } : {}),
      });
      setStore(res.data);
      setForm(fromStore(res.data));
      setRegenerateSlug(false);
      setSaved(true);
      client.invalidateQueries({ queryKey: queryKeys.vendorDashboard() });
      addToast({ type: 'success', message: 'Store profile saved' });
    } catch (err: unknown) {
      setError(errMessage(err, 'Could not save your store profile'));
    } finally {
      setSaving(false);
    }
  };

  const head = (
    <VendorPageHead
      title="Shop settings"
      description={
        <>
          Control the public details buyers see and how they reach you. Your subscription is managed from the{' '}
          <Link to="/vendor" className="ws-vxlink">Overview</Link>.
        </>
      }
    />
  );

  if (loading) {
    return (
      <VendorPage>
        {head}
        <div className="ws-skeleton" style={{ height: 400, maxWidth: 820, borderRadius: 'var(--ws-radius-lg)' }} />
      </VendorPage>
    );
  }

  if (!store || !form) {
    return (
      <VendorPage>
        {head}
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error ?? 'Could not load your store.'}</span>
        </div>
      </VendorPage>
    );
  }

  const f = (name: string) => `${id}-${name}`;

  return (
    <VendorPage>
      {head}

      <form onSubmit={save} className="ws-vxform">
        <section>
          <VendorSectionHead title="Public shop profile" description="These details appear on your shop and listing pages." />
          <div className="ws-vxgroup">
            <Field label="Shop name" required htmlFor={f('name')} wide>
              <input
                id={f('name')}
                className="ws-vxinput"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={60}
                required
              />
            </Field>

            {/* The one link-breaking control on the page, armed per save. */}
            {nameChanged && (
              <div className="ws-vxfieldset is-wide">
                <span className="ws-cfcheck">
                  <input
                    id={f('slug')}
                    type="checkbox"
                    className="ws-cfcheck__box"
                    checked={regenerateSlug}
                    onChange={(e) => setRegenerateSlug(e.target.checked)}
                  />
                  <label htmlFor={f('slug')}>
                    Also update my shop link to match the new name.
                    <span className="ws-vxhint ws-vxhint--warn">
                      This changes your URL. Anywhere you have shared the old link will stop working.
                    </span>
                  </label>
                </span>
              </div>
            )}

            <Field label="Shop bio" htmlFor={f('bio')} counter={`${form.description.length} / ${BIO_MAX}`} wide>
              <textarea
                id={f('bio')}
                className="ws-vxinput ws-vxinput--area"
                rows={4}
                maxLength={BIO_MAX}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What do you sell? Why should a buyer contact you?"
              />
            </Field>
          </div>
        </section>

        <section>
          <VendorSectionHead title="Location" description="Buyers browse by it, so it decides who finds you." />
          <div className="ws-vxgroup">
            <Field label="Country" required htmlFor={f('country')}>
              <CountrySelect
                id={f('country')}
                className="ws-select ws-vxinput ws-vxinput--select"
                value={form.country}
                onChange={(e) => {
                  set('country', e.target.value);
                  set('state', '');
                }}
              />
            </Field>
            <Field label="State / region" required htmlFor={f('state')}>
              <StateSelect
                id={f('state')}
                className="ws-select ws-vxinput ws-vxinput--select"
                country={form.country}
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
              />
            </Field>
            <Field label="City / area" htmlFor={f('city')}>
              <input id={f('city')} className="ws-vxinput" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Ikeja" />
            </Field>
            <Field label="Shop address" htmlFor={f('address')}>
              <input
                id={f('address')}
                className="ws-vxinput"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Shown to buyers if you have a physical shop"
              />
            </Field>
          </div>
        </section>

        <section>
          <VendorSectionHead
            title="Contact"
            description="Buyers message you on WorldStore first; these let them reach you directly too. Clearing a field removes it from your shop."
          />
          <div className="ws-vxgroup">
            <Field label="Phone number" htmlFor={f('phone')}>
              <input id={f('phone')} type="tel" className="ws-vxinput" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 08031234567" />
            </Field>
            <Field label="WhatsApp number" htmlFor={f('wa')}>
              <input id={f('wa')} type="tel" className="ws-vxinput" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="If different from your phone number" />
            </Field>
            <Field label="Contact email" htmlFor={f('email')}>
              <input id={f('email')} type="email" className="ws-vxinput" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Website or social page" htmlFor={f('web')}>
              <input id={f('web')} type="url" className="ws-vxinput" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://instagram.com/yourstore" />
            </Field>
          </div>
        </section>

        <section>
          <VendorSectionHead title="Branding" description="Your logo sits on every listing; the banner heads your shop page." />
          <div className="ws-vxgroup">
            {(['logo', 'banner'] as const).map((kind) => {
              const value = form[kind];
              const preview = previews[kind] ?? value;
              return (
                <div key={kind} className={`ws-vxfieldset${kind === 'banner' ? ' is-wide' : ''}`}>
                  <span className="ws-vxlabel">{kind === 'logo' ? 'Logo' : 'Banner'}</span>
                  {value && preview ? (
                    <div className={`ws-vxbrand ws-vxbrand--${kind}`}>
                      <img src={preview} alt="" />
                      <button
                        type="button"
                        className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost"
                        onClick={() => {
                          set(kind, null);
                          setPreviews((p) => ({ ...p, [kind]: null }));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className={`ws-vxdrop${uploading === kind ? ' is-busy' : ''}`}>
                      <ImagePlus size={18} aria-hidden />
                      <span>{uploading === kind ? 'Uploading…' : `Choose a ${kind} image`}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="ws-sr-only"
                        disabled={uploading === kind}
                        onChange={(e) => uploadImage(kind, e.target.files)}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <VendorSectionHead title="Shop link" description="Where buyers land when you share your shop." />
          <div className="ws-vxgroup ws-vxgroup--row">
            <code className="ws-vxcode">{publicUrl}</code>
            <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline" onClick={copyUrl}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {store.isPubliclyVisible ? (
              <Link to={`/stores/${store.slug}`} className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost">
                View public page
                <ExternalLink size={14} aria-hidden />
              </Link>
            ) : (
              <span className="ws-vxhint ws-vxhint--warn">Not visible to buyers yet. Activate from the Overview.</span>
            )}
          </div>
        </section>

        {error && (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="ws-vxsavebar">
          <span className={`ws-vxsavebar__state${saved && !dirty ? ' is-saved' : ''}`} aria-live="polite">
            {saved && !dirty ? 'Settings saved' : dirty ? 'You have unsaved changes' : 'Everything is up to date'}
          </span>
          <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost" disabled={!dirty || saving} onClick={discard}>
            Discard
          </button>
          <button type="submit" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary" disabled={!dirty || saving || uploading != null}>
            <Check size={16} aria-hidden />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </VendorPage>
  );
}
