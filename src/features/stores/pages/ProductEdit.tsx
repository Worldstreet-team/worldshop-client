import { Link } from 'react-router-dom';
import { AlertCircle, Plus, X } from 'lucide-react';
import {
  type PriceType
} from '@/features/stores/api';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import { imageSrc } from '@/features/listings/model';

const CONDITIONS = ['NEW', 'USED', 'REFURBISHED'] as const;
const MAX_CUSTOM_FIELDS = 30;

const fieldCls = (bad: boolean) => `ws-field${bad ? ' ws-field--invalid' : ''}`;
const selectCls = (bad: boolean) => `ws-select${bad ? ' ws-select--invalid' : ''}`;
import { useListingEditor } from '@/features/stores/hooks/useListingEditor';

export default function ListingEdit() {
  const {
    productsBasePath,
    isNew,
    loading,
    saving,
    uploading,
    listing,
    problems,
    fieldErrors,
    name,
    setName,
    description,
    setDescription,
    parentId,
    setParentId,
    categoryId,
    setCategoryId,
    priceType,
    setPriceType,
    basePrice,
    setBasePrice,
    maxPrice,
    setMaxPrice,
    isNegotiable,
    setIsNegotiable,
    condition,
    setCondition,
    country,
    setCountry,
    state,
    setState,
    city,
    setCity,
    tags,
    setTags,
    images,
    setImages,
    attributes,
    setAttributes,
    customFields,
    setCustomFields,
    variants,
    setVariants,
    parents,
    children,
    productAttrs,
    variantAttrs,
    handleUpload,
    save,
  } = useListingEditor();

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
        <Link to={productsBasePath} className="ws-btn ws-btn--sm ws-btn--secondary">
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

        <form onSubmit={(e) => { e.preventDefault(); save(false); }}>

        <fieldset disabled={readOnly} className="ws-stack--lg" style={{ border: 0, padding: 0, margin: 0 }}>

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
                      className="ws-thumbremove"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove image"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

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

              <div className="ws-formfield">
                <label htmlFor="country" className="ws-formfield__label">Country</label>
                <CountrySelect
                  id="country"
                  value={country}
                  placeholder="Same as my store"
                  onChange={(e) => { setCountry(e.target.value); setState(''); }}
                />
              </div>

              <div className="ws-formfield">
                <label htmlFor="state" className="ws-formfield__label">State / Region</label>
                <StateSelect
                  id="state"
                  country={country}
                  value={state}
                  placeholder="Same as my store"
                  onChange={(e) => setState(e.target.value)}
                />
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
        </fieldset>
        </form>
      </div>
    </div>
  );
}
