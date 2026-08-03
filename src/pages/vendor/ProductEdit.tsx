import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Plus, X } from 'lucide-react';
import {
  listingService,
  type Listing,
  type ListingPayload,
  type CategoryFormSpec,
  type CustomField,
  type ListingVariant,
  type PriceType,
} from '@/services/storeService';
import { categoryService } from '@/services/productService';
import type { Category } from '@/types/product.types';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Listing editor.
 *
 * Detail is captured in two layers, and keeping them apart is the whole point:
 *
 *   - **Attributes** come from the category (admin-defined, fixed options).
 *     Buyers filter on these, which only works because the vocabulary is
 *     controlled — so the vendor picks from a list rather than typing.
 *   - **Custom fields** are whatever else this particular product needs.
 *     Free text, shown as a spec table, never used as a filter.
 *
 * Saving and publishing are separate. Save keeps a draft in any state; publish
 * runs the category's requirements server-side and rejects with a list of what
 * is missing, which is shown in place rather than as a toast.
 */

const errMessage = (err: unknown, fallback: string) => toApiError(err, fallback).message;

const CONDITIONS = ['NEW', 'USED', 'REFURBISHED'] as const;
const MAX_CUSTOM_FIELDS = 30;

/** Human names for the field paths the server's validator reports. */
const FIELD_LABELS: Record<string, string> = {
  name: 'Product name',
  description: 'Description',
  categoryId: 'Category',
  category: 'Category',
  priceType: 'Pricing',
  basePrice: 'Price',
  maxPrice: 'Maximum price',
  images: 'Photos',
  condition: 'Condition',
  state: 'State',
  city: 'City',
  tags: 'Tags',
  attributes: 'Product details',
  customFields: 'Additional details',
  variants: 'Variants',
};

/**
 * Turn a server validation path like "attributes.Brand" or "variants.0.name"
 * into { field, label }: `field` matches the client's fieldErrors keys where
 * possible so the message lands next to the input, `label` prefixes the
 * summary line so it makes sense on its own.
 */
function mapServerFieldPath(path: string): { field: string; label: string } {
  const [head, ...rest] = path.split('.');
  if (head === 'attributes' && rest[0]) return { field: `attr-${rest[0]}`, label: rest[0] };
  if (head === 'variants' && rest[0] !== undefined) {
    return { field: 'variants', label: `Variant ${Number(rest[0]) + 1}` };
  }
  if (head === 'categoryId') return { field: 'category', label: 'Category' };
  return { field: head, label: FIELD_LABELS[head] ?? head };
}

// Error styling is carried on classes rather than inline style objects so the
// invalid state resolves through the theme's danger token.
const fieldCls = (bad: boolean) => `ws-field${bad ? ' ws-field--invalid' : ''}`;
const selectCls = (bad: boolean) => `ws-select${bad ? ' ws-select--invalid' : ''}`;

type ImageRef = Record<string, unknown> & { key?: string; url?: string };

const imageSrc = (img: ImageRef): string => String(img.url || img.key || '');

export default function ListingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spec, setSpec] = useState<CategoryFormSpec | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  // Summary list shown above the form, and the same messages keyed by field so
  // they also appear inline next to the input that caused them.
  const [problems, setProblems] = useState<string[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Form state ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('FIXED');
  const [basePrice, setBasePrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [condition, setCondition] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<ImageRef[]>([]);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [variants, setVariants] = useState<ListingVariant[]>([]);

  // Two-level picker, rebuilt from the flat list the public endpoint returns.
  // Parents with no children are hidden: selecting one would leave the vendor
  // staring at an empty subcategory list, and listings cannot be filed against
  // a top-level category anyway. Legacy pre-taxonomy categories look like this.
  const parents = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);
  const children = useMemo(
    () => categories.filter((c) => c.parentId === parentId),
    [categories, parentId],
  );

  const productAttrs = useMemo(
    () => spec?.attributes.filter((a) => a.appliesTo === 'PRODUCT') ?? [],
    [spec],
  );
  const variantAttrs = useMemo(
    () => spec?.attributes.filter((a) => a.appliesTo === 'VARIANT') ?? [],
    [spec],
  );

  useEffect(() => {
    categoryService
      .getCategories()
      .then(setCategories)
      .catch(() => addToast({ type: 'error', message: 'Could not load categories' }));
  }, [addToast]);

  // Load an existing listing.
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;

    listingService
      .get(id!)
      .then((res) => {
        if (cancelled) return;
        const l = res.data;
        setListing(l);
        setName(l.name);
        setDescription(l.description);
        setCategoryId(l.categoryId ?? '');
        setPriceType(l.priceType);
        setBasePrice(l.basePrice != null ? String(l.basePrice) : '');
        setMaxPrice(l.maxPrice != null ? String(l.maxPrice) : '');
        setIsNegotiable(l.isNegotiable);
        setCondition(l.condition ?? '');
        setState(l.state ?? '');
        setCity(l.city ?? '');
        setTags(l.tags.join(', '));
        setImages((l.images as ImageRef[]) ?? []);
        setAttributes(l.attributes ?? {});
        setCustomFields(l.customFields ?? []);
        setVariants(l.variants ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) addToast({ type: 'error', message: errMessage(err, 'Listing not found') });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isNew, addToast]);

  // Derive the parent select from a loaded listing's category.
  useEffect(() => {
    if (!categoryId || !categories.length || parentId) return;
    const own = categories.find((c) => c.id === categoryId);
    if (own?.parentId) setParentId(own.parentId);
  }, [categoryId, categories, parentId]);

  // The category decides which fields exist, so the spec is refetched whenever
  // it changes.
  useEffect(() => {
    if (!categoryId) {
      setSpec(null);
      return;
    }
    let cancelled = false;

    listingService
      .getFormSpec(categoryId)
      .then((res) => {
        if (!cancelled) setSpec(res.data);
      })
      .catch(() => {
        if (!cancelled) setSpec(null);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await listingService.uploadImages(Array.from(files));
      setImages((prev) => [...prev, ...(res.data as ImageRef[])]);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Image upload failed') });
    } finally {
      setUploading(false);
    }
  };

  /**
   * Client-side mirror of the server's rules — createListingSchema for every
   * save, plus the publish standards (photo, required attributes) when the
   * vendor is publishing. Same thresholds, same wording where the server has
   * custom messages, so passing here means the server will not bounce it.
   */
  const validateForm = useCallback(
    (thenPublish: boolean): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (name.trim().length < 3) errors.name = 'Product name must be at least 3 characters.';
      if (description.trim().length < 20) errors.description = 'Describe the product in at least 20 characters.';
      if (!parentId) errors.category = 'Choose a category.';
      else if (!categoryId) errors.category = 'Choose a subcategory.';

      if (priceType === 'FIXED' && basePrice === '') {
        errors.basePrice = 'A price is required.';
      }
      if (priceType === 'RANGE') {
        if (basePrice === '' || maxPrice === '') {
          errors.maxPrice = 'A price range needs both a minimum and a maximum.';
        } else if (Number(maxPrice) < Number(basePrice)) {
          errors.maxPrice = 'Maximum price cannot be below the minimum.';
        }
      }

      // The server only enforces these at publish; drafts may stay incomplete.
      if (thenPublish) {
        if (images.length === 0) errors.images = 'At least one photo is required to publish.';
        for (const attr of productAttrs) {
          if (attr.isRequired && !(attributes[attr.name] ?? '').trim()) {
            errors[`attr-${attr.name}`] = `${attr.name} is required.`;
          }
        }
        variants.forEach((variant, i) => {
          for (const attr of variantAttrs) {
            if (attr.isRequired && !(variant.attributes[attr.name] ?? '').trim()) {
              errors.variants = errors.variants ?? `Variant ${i + 1} is missing ${attr.name}.`;
            }
          }
        });
      }

      return errors;
    },
    [name, description, parentId, categoryId, priceType, basePrice, maxPrice, images,
      productAttrs, attributes, variants, variantAttrs],
  );

  const save = useCallback(
    async (thenPublish: boolean) => {
      setProblems(null);
      setFieldErrors({});

      const clientErrors = validateForm(thenPublish);
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        setProblems(Object.values(clientErrors));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const payload: ListingPayload = {
        name: name.trim(),
        description: description.trim(),
        categoryId,
        priceType,
        // "" must be omitted rather than sent as 0 — zero is a real price.
        basePrice: basePrice === '' ? undefined : Number(basePrice),
        maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
        isNegotiable,
        condition: condition || undefined,
        state: state || undefined,
        city: city || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
        // Blank attribute values are dropped rather than stored as empty
        // strings, which would look like an answer to a required field.
        attributes: Object.fromEntries(Object.entries(attributes).filter(([, v]) => v !== '')),
        customFields: customFields.filter((f) => f.label.trim() && f.value.trim()),
        variants,
      };

      setSaving(true);
      try {
        const saved = isNew
          ? await listingService.create(payload)
          : await listingService.update(id!, payload);

        if (thenPublish) {
          const res = await listingService.publish(saved.data.id);
          addToast({ type: 'success', message: res.data.message });
        } else {
          addToast({ type: 'success', message: isNew ? 'Listing saved as draft' : 'Listing updated' });
        }
        navigate('/vendor/products');
      } catch (err: unknown) {
        // Shown in place, because a toast disappears before the vendor can act
        // on it. Validation rejections carry per-field messages — surface each
        // next to its input and as a summary line; publish rejections arrive as
        // a single message already listing every unmet requirement.
        const apiErr = toApiError(err, 'Could not save this listing');
        if (apiErr.errors && Object.keys(apiErr.errors).length > 0) {
          const mapped: Record<string, string> = {};
          const lines: string[] = [];
          for (const [path, msg] of Object.entries(apiErr.errors)) {
            const { field, label } = mapServerFieldPath(path);
            mapped[field] = mapped[field] ?? msg;
            lines.push(`${label}: ${msg}`);
          }
          setFieldErrors(mapped);
          setProblems(lines);
        } else {
          setProblems([apiErr.message]);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setSaving(false);
      }
    },
    [name, description, categoryId, priceType, basePrice, maxPrice, isNegotiable, condition,
      state, city, tags, images, attributes, customFields, variants, isNew, id, addToast,
      navigate, validateForm],
  );

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Edit Listing</h1></div>
        <div className="ws-skeleton" style={{ height: 420, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  const readOnly = listing?.status === 'REMOVED';

  return (
    <div className="ws-page" style={{ maxWidth: 900 }}>
      <div className="ws-page__head">
        <h1 className="ws-page__title">{isNew ? 'Add Listing' : 'Edit Listing'}</h1>
        <Link to="/vendor/products" className="ws-btn ws-btn--sm ws-btn--secondary">
          Back to listings
        </Link>
      </div>

      <div className="ws-stack--lg">
        {readOnly && (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>This listing was removed by an administrator and cannot be edited.</span>
          </div>
        )}

        {problems && problems.length > 0 && (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            {problems.length === 1 ? (
              <span>{problems[0]}</span>
            ) : (
              <span>
                <strong>Fix the following before saving:</strong>
                <ul style={{ margin: 'var(--ws-space-1) 0 0', paddingLeft: '1.2rem' }}>
                  {problems.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </span>
            )}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="ws-stack--lg">
          {/* ── Basics ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Basics</h2>

            <div className="ws-formfield">
              <label htmlFor="name" className="ws-formfield__label">Product Name *</label>
              <input
                id="name"
                className={fieldCls(!!fieldErrors.name)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ankara Maxi Dress"
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && <p className="ws-formfield__error">{fieldErrors.name}</p>}
            </div>

            <div className="ws-formfield">
              <label htmlFor="description" className="ws-formfield__label">Description *</label>
              <textarea
                id="description"
                className={`ws-textarea${fieldErrors.description ? ' ws-field--invalid' : ''}`}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product in detail — buyers decide whether to message you from this."
                aria-invalid={!!fieldErrors.description}
              />
              {fieldErrors.description && <p className="ws-formfield__error">{fieldErrors.description}</p>}
            </div>

            {/* Listings attach to a subcategory: that is where the attributes
                live, and where buyers browse. */}
            <div className="ws-formgrid">
              <div className="ws-formfield">
                <label htmlFor="parent" className="ws-formfield__label">Category *</label>
                <select
                  id="parent"
                  className="ws-select"
                  value={parentId}
                  onChange={(e) => { setParentId(e.target.value); setCategoryId(''); setAttributes({}); }}
                >
                  <option value="">Select a category</option>
                  {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {!parentId && fieldErrors.category && (
                  <p className="ws-formfield__error">{fieldErrors.category}</p>
                )}
              </div>

              {parentId && (
                <div className="ws-formfield">
                  <label htmlFor="category" className="ws-formfield__label">Subcategory *</label>
                  <select
                    id="category"
                    className={selectCls(!!fieldErrors.category)}
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); setAttributes({}); }}
                    aria-invalid={!!fieldErrors.category}
                  >
                    <option value="">Select a subcategory</option>
                    {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {fieldErrors.category && <p className="ws-formfield__error">{fieldErrors.category}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ── Price ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Price</h2>

            <div className="ws-formgrid">
              <div className="ws-formfield">
                <label htmlFor="priceType" className="ws-formfield__label">Pricing</label>
                <select
                  id="priceType"
                  className="ws-select"
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value as PriceType)}
                >
                  <option value="FIXED">Fixed price</option>
                  <option value="RANGE">Price range</option>
                  <option value="ON_REQUEST">Contact for price</option>
                </select>
              </div>

              {priceType !== 'ON_REQUEST' && (
                <div className="ws-formfield">
                  <label htmlFor="basePrice" className="ws-formfield__label">
                    {priceType === 'RANGE' ? 'From (₦)' : 'Price (₦)'}
                  </label>
                  <input
                    id="basePrice"
                    type="number"
                    min="0"
                    className={`${fieldCls(!!fieldErrors.basePrice)} ws-num`}
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    aria-invalid={!!fieldErrors.basePrice}
                  />
                  {fieldErrors.basePrice && <p className="ws-formfield__error">{fieldErrors.basePrice}</p>}
                </div>
              )}

              {priceType === 'RANGE' && (
                <div className="ws-formfield">
                  <label htmlFor="maxPrice" className="ws-formfield__label">To (₦)</label>
                  <input
                    id="maxPrice"
                    type="number"
                    min="0"
                    className={`${fieldCls(!!fieldErrors.maxPrice)} ws-num`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    aria-invalid={!!fieldErrors.maxPrice}
                  />
                  {fieldErrors.maxPrice && <p className="ws-formfield__error">{fieldErrors.maxPrice}</p>}
                </div>
              )}
            </div>

            <label className="ws-check">
              <input
                type="checkbox"
                className="ws-check__input"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
              />
              <span className="ws-check__label">Price is negotiable</span>
            </label>
          </section>

          {/* ── Photos ── */}
          <section className="ws-card ws-stack--lg">
            <div>
              <h2 className="ws-h2">Photos</h2>
              <p className="ws-caption ws-muted">At least one photo is required to publish.</p>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              className="ws-file"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
            {uploading && <p className="ws-caption ws-muted">Uploading…</p>}
            {fieldErrors.images && <p className="ws-formfield__error">{fieldErrors.images}</p>}

            {images.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={imageSrc(img)}
                      alt=""
                      style={{
                        width: 96, height: 96, objectFit: 'cover',
                        borderRadius: 'var(--ws-radius-lg)',
                        border: '1px solid var(--ws-border-hairline)',
                        display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{
                        position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                        borderRadius: 'var(--ws-radius-pill)', border: 'none',
                        background: 'var(--ws-status-danger)', color: '#fff', cursor: 'pointer',
                        display: 'grid', placeItems: 'center', lineHeight: 1,
                      }}
                      aria-label="Remove image"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Category attributes: the filterable layer ── */}
          {productAttrs.length > 0 && (
            <section className="ws-card ws-stack--lg">
              <div>
                <h2 className="ws-h2">Product Details</h2>
                <p className="ws-caption ws-muted">
                  Buyers filter search results by these, so fill in as many as apply.
                </p>
              </div>

              <div className="ws-formgrid">
                {productAttrs.map((attr) => (
                  <div className="ws-formfield" key={attr.name}>
                    <label htmlFor={`attr-${attr.name}`} className="ws-formfield__label">
                      {attr.name}{attr.isRequired ? ' *' : ''}
                    </label>

                    {attr.type === 'SELECT' ? (
                      <select
                        id={`attr-${attr.name}`}
                        className={selectCls(!!fieldErrors[`attr-${attr.name}`])}
                        value={attributes[attr.name] ?? ''}
                        onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                        aria-invalid={!!fieldErrors[`attr-${attr.name}`]}
                      >
                        <option value="">Select {attr.name.toLowerCase()}</option>
                        {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        id={`attr-${attr.name}`}
                        type={attr.type === 'NUMBER' ? 'number' : 'text'}
                        className={fieldCls(!!fieldErrors[`attr-${attr.name}`])}
                        value={attributes[attr.name] ?? ''}
                        onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                        aria-invalid={!!fieldErrors[`attr-${attr.name}`]}
                      />
                    )}
                    {fieldErrors[`attr-${attr.name}`] && (
                      <p className="ws-formfield__error">{fieldErrors[`attr-${attr.name}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Custom fields: anything the category does not cover ── */}
          <section className="ws-card ws-stack--lg">
            <div>
              <h2 className="ws-h2">Additional Details</h2>
              <p className="ws-caption ws-muted">
                Add anything specific to this product that the fields above do not cover.
                These appear on your listing but are not used in search filters.
              </p>
            </div>

            {customFields.length > 0 && (
              <div className="ws-stack">
                {customFields.map((field, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
                    <input
                      className="ws-field"
                      placeholder="Label — e.g. Warranty"
                      value={field.label}
                      onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
                      style={{ flex: 1, minWidth: 140 }}
                    />
                    <input
                      className="ws-field"
                      placeholder="Value — e.g. 6 months"
                      value={field.value}
                      onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                      style={{ flex: 2, minWidth: 180 }}
                    />
                    <button
                      type="button"
                      className="ws-btn ws-btn--ghost"
                      onClick={() => setCustomFields((f) => f.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {customFields.length < MAX_CUSTOM_FIELDS && (
              <div>
                <button
                  type="button"
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  onClick={() => setCustomFields((f) => [...f, { label: '', value: '' }])}
                >
                  <Plus size={14} aria-hidden />
                  Add field
                </button>
              </div>
            )}
          </section>

          {/* ── Variants ── */}
          {variantAttrs.length > 0 && (
            <section className="ws-card ws-stack--lg">
              <div>
                <h2 className="ws-h2">Variants</h2>
                <p className="ws-caption ws-muted">
                  Add a row per {variantAttrs.map((a) => a.name.toLowerCase()).join(' / ')} you offer.
                  Leave empty if this product has only one version.
                </p>
              </div>
              {fieldErrors.variants && <p className="ws-formfield__error">{fieldErrors.variants}</p>}

              {variants.map((variant, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--ws-border-hairline)',
                    borderRadius: 'var(--ws-radius-lg)',
                    padding: 'var(--ws-space-3)',
                    background: 'var(--ws-bg-sunken)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="ws-formfield" style={{ flex: 1, minWidth: 160 }}>
                      <label className="ws-formfield__label">Name</label>
                      <input
                        className="ws-field"
                        placeholder="e.g. Red / XL"
                        value={variant.name}
                        onChange={(e) => setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                      />
                    </div>

                    {variantAttrs.map((attr) => (
                      <div className="ws-formfield" key={attr.name} style={{ minWidth: 130 }}>
                        <label className="ws-formfield__label">{attr.name}{attr.isRequired ? ' *' : ''}</label>
                        {attr.type === 'SELECT' ? (
                          <select
                            className="ws-select"
                            value={variant.attributes[attr.name] ?? ''}
                            onChange={(e) =>
                              setVariants((v) => v.map((x, idx) =>
                                idx === i ? { ...x, attributes: { ...x.attributes, [attr.name]: e.target.value } } : x))}
                          >
                            <option value="">—</option>
                            {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            className="ws-field"
                            value={variant.attributes[attr.name] ?? ''}
                            onChange={(e) =>
                              setVariants((v) => v.map((x, idx) =>
                                idx === i ? { ...x, attributes: { ...x.attributes, [attr.name]: e.target.value } } : x))}
                          />
                        )}
                      </div>
                    ))}

                    <div className="ws-formfield" style={{ minWidth: 120 }}>
                      <label className="ws-formfield__label">Price (₦)</label>
                      <input
                        type="number"
                        min="0"
                        className="ws-field ws-num"
                        value={variant.price ?? ''}
                        onChange={(e) =>
                          setVariants((v) => v.map((x, idx) =>
                            idx === i ? { ...x, price: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
                      />
                    </div>

                    <label className="ws-check" style={{ paddingBottom: 'var(--ws-space-3)' }}>
                      <input
                        type="checkbox"
                        className="ws-check__input"
                        checked={variant.isAvailable !== false}
                        onChange={(e) =>
                          setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, isAvailable: e.target.checked } : x)))}
                      />
                      <span className="ws-check__label">Available</span>
                    </label>

                    <button
                      type="button"
                      className="ws-btn ws-btn--ghost"
                      onClick={() => setVariants((v) => v.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div>
                <button
                  type="button"
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  onClick={() => setVariants((v) => [...v, { name: '', attributes: {}, isAvailable: true }])}
                >
                  <Plus size={14} aria-hidden />
                  Add variant
                </button>
              </div>
            </section>
          )}

          {/* ── Location & condition ── */}
          <section className="ws-card ws-stack--lg">
            <h2 className="ws-h2">Item Details</h2>

            <div className="ws-formgrid">
              <div className="ws-formfield">
                <label htmlFor="condition" className="ws-formfield__label">Condition</label>
                <select id="condition" className="ws-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="">Not specified</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              {/* Defaults to the store's location server-side when left blank. */}
              <div className="ws-formfield">
                <label htmlFor="state" className="ws-formfield__label">State</label>
                <select id="state" className="ws-select" value={state} onChange={(e) => setState(e.target.value)}>
                  <option value="">Same as my store</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="ws-formfield">
                <label htmlFor="city" className="ws-formfield__label">City / Area</label>
                <input id="city" className="ws-field" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="ws-formfield">
                <label htmlFor="tags" className="ws-formfield__label">Tags</label>
                <input
                  id="tags"
                  className="ws-field"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma separated — helps buyers find this in search"
                />
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="ws-btn ws-btn--secondary" disabled={saving || readOnly}>
              {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              type="button"
              className="ws-btn ws-btn--primary"
              disabled={saving || readOnly}
              onClick={() => save(true)}
            >
              {saving ? 'Saving…' : 'Save & publish'}
            </button>
            <span className="ws-caption ws-muted">Drafts are only visible to you.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
