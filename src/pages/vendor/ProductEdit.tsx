import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

type ApiError = { response?: { data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;

const CONDITIONS = ['NEW', 'USED', 'REFURBISHED'] as const;
const MAX_CUSTOM_FIELDS = 30;

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
  const [problems, setProblems] = useState<string | null>(null);

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

  const productAttrs = spec?.attributes.filter((a) => a.appliesTo === 'PRODUCT') ?? [];
  const variantAttrs = spec?.attributes.filter((a) => a.appliesTo === 'VARIANT') ?? [];

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

  const save = useCallback(
    async (thenPublish: boolean) => {
      setProblems(null);

      if (!name.trim() || !description.trim() || !categoryId) {
        setProblems('Name, description and category are required before saving.');
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
        // Publish rejections list every unmet requirement — shown in place,
        // because a toast disappears before the vendor can act on it.
        setProblems(errMessage(err, 'Could not save this listing'));
      } finally {
        setSaving(false);
      }
    },
    [name, description, categoryId, priceType, basePrice, maxPrice, isNegotiable, condition,
      state, city, tags, images, attributes, customFields, variants, isNew, id, addToast, navigate],
  );

  if (loading) {
    return <div className="vendor-product-edit"><p style={{ color: '#667085' }}>Loading listing…</p></div>;
  }

  const readOnly = listing?.status === 'REMOVED';

  return (
    <div className="vendor-product-edit">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{isNew ? 'Add Listing' : 'Edit Listing'}</h1>
        <Link to="/vendor/products" className="btn-secondary">Back to listings</Link>
      </div>

      {readOnly && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', marginBottom: '1rem' }}>
          This listing was removed by an administrator and cannot be edited.
        </div>
      )}

      {problems && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: '#fef3f2', border: '1px solid #fda29b', color: '#b42318', marginBottom: '1rem' }}>
          {problems}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); save(false); }}>
        {/* ── Basics ── */}
        <section className="dashboard-section">
          <h2>Basics</h2>

          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ankara Maxi Dress" />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product in detail — buyers decide whether to message you from this."
            />
          </div>

          {/* Listings attach to a subcategory: that is where the attributes
              live, and where buyers browse. */}
          <div className="form-group">
            <label htmlFor="parent">Category *</label>
            <select
              id="parent"
              value={parentId}
              onChange={(e) => { setParentId(e.target.value); setCategoryId(''); setAttributes({}); }}
            >
              <option value="">Select a category</option>
              {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {parentId && (
            <div className="form-group">
              <label htmlFor="category">Subcategory *</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setAttributes({}); }}
              >
                <option value="">Select a subcategory</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </section>

        {/* ── Price ── */}
        <section className="dashboard-section">
          <h2>Price</h2>

          <div className="form-group">
            <label htmlFor="priceType">Pricing</label>
            <select id="priceType" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)}>
              <option value="FIXED">Fixed price</option>
              <option value="RANGE">Price range</option>
              <option value="ON_REQUEST">Contact for price</option>
            </select>
          </div>

          {priceType !== 'ON_REQUEST' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="basePrice">{priceType === 'RANGE' ? 'From (₦)' : 'Price (₦)'}</label>
                <input id="basePrice" type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
              </div>
              {priceType === 'RANGE' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="maxPrice">To (₦)</label>
                  <input id="maxPrice" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} />
            Price is negotiable
          </label>
        </section>

        {/* ── Photos ── */}
        <section className="dashboard-section">
          <h2>Photos</h2>
          <p style={{ color: '#667085', fontSize: '0.88rem' }}>At least one photo is required to publish.</p>

          <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
          {uploading && <p style={{ color: '#667085' }}>Uploading…</p>}

          {images.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={imageSrc(img)}
                    alt=""
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid #e4e7ec' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                      borderRadius: '50%', border: 'none', background: '#b42318', color: 'white', cursor: 'pointer',
                    }}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Category attributes: the filterable layer ── */}
        {productAttrs.length > 0 && (
          <section className="dashboard-section">
            <h2>Product Details</h2>
            <p style={{ color: '#667085', fontSize: '0.88rem' }}>
              Buyers filter search results by these, so fill in as many as apply.
            </p>

            {productAttrs.map((attr) => (
              <div className="form-group" key={attr.name}>
                <label htmlFor={`attr-${attr.name}`}>
                  {attr.name}{attr.isRequired ? ' *' : ''}
                </label>

                {attr.type === 'SELECT' ? (
                  <select
                    id={`attr-${attr.name}`}
                    value={attributes[attr.name] ?? ''}
                    onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                  >
                    <option value="">Select {attr.name.toLowerCase()}</option>
                    {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    id={`attr-${attr.name}`}
                    type={attr.type === 'NUMBER' ? 'number' : 'text'}
                    value={attributes[attr.name] ?? ''}
                    onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Custom fields: anything the category does not cover ── */}
        <section className="dashboard-section">
          <h2>Additional Details</h2>
          <p style={{ color: '#667085', fontSize: '0.88rem' }}>
            Add anything specific to this product that the fields above do not cover.
            These appear on your listing but are not used in search filters.
          </p>

          {customFields.map((field, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                placeholder="Label — e.g. Warranty"
                value={field.label}
                onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
                style={{ flex: 1 }}
              />
              <input
                placeholder="Value — e.g. 6 months"
                value={field.value}
                onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                style={{ flex: 2 }}
              />
              <button type="button" className="btn-secondary" onClick={() => setCustomFields((f) => f.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          ))}

          {customFields.length < MAX_CUSTOM_FIELDS && (
            <button type="button" className="btn-secondary" onClick={() => setCustomFields((f) => [...f, { label: '', value: '' }])}>
              + Add field
            </button>
          )}
        </section>

        {/* ── Variants ── */}
        {variantAttrs.length > 0 && (
          <section className="dashboard-section">
            <h2>Variants</h2>
            <p style={{ color: '#667085', fontSize: '0.88rem' }}>
              Add a row per {variantAttrs.map((a) => a.name.toLowerCase()).join(' / ')} you offer.
              Leave empty if this product has only one version.
            </p>

            {variants.map((variant, i) => (
              <div key={i} style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                    <label>Name</label>
                    <input
                      placeholder="e.g. Red / XL"
                      value={variant.name}
                      onChange={(e) => setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                    />
                  </div>

                  {variantAttrs.map((attr) => (
                    <div className="form-group" key={attr.name} style={{ minWidth: 130, marginBottom: 0 }}>
                      <label>{attr.name}{attr.isRequired ? ' *' : ''}</label>
                      {attr.type === 'SELECT' ? (
                        <select
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
                          value={variant.attributes[attr.name] ?? ''}
                          onChange={(e) =>
                            setVariants((v) => v.map((x, idx) =>
                              idx === i ? { ...x, attributes: { ...x.attributes, [attr.name]: e.target.value } } : x))}
                        />
                      )}
                    </div>
                  ))}

                  <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
                    <label>Price (₦)</label>
                    <input
                      type="number"
                      min="0"
                      value={variant.price ?? ''}
                      onChange={(e) =>
                        setVariants((v) => v.map((x, idx) =>
                          idx === i ? { ...x, price: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={variant.isAvailable !== false}
                      onChange={(e) =>
                        setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, isAvailable: e.target.checked } : x)))}
                    />
                    Available
                  </label>

                  <button type="button" className="btn-secondary" onClick={() => setVariants((v) => v.filter((_, idx) => idx !== i))}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVariants((v) => [...v, { name: '', attributes: {}, isAvailable: true }])}
            >
              + Add variant
            </button>
          </section>
        )}

        {/* ── Location & condition ── */}
        <section className="dashboard-section">
          <h2>Item Details</h2>

          <div className="form-group">
            <label htmlFor="condition">Condition</label>
            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">Not specified</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Defaults to the store's location server-side when left blank. */}
          <div className="form-group">
            <label htmlFor="state">State</label>
            <select id="state" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Same as my store</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">City / Area</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma separated — helps buyers find this in search"
            />
          </div>
        </section>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" className="btn-secondary" disabled={saving || readOnly}>
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button type="button" className="btn-primary" disabled={saving || readOnly} onClick={() => save(true)}>
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
          <span style={{ color: '#667085', fontSize: '0.85rem' }}>Drafts are only visible to you.</span>
        </div>
      </form>
    </div>
  );
}
