import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ImageOff, Plus, Upload, X,
} from 'lucide-react';
import type { PriceType } from '@/features/stores/api';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import Modal from '@/shared/components/common/Modal';
import { fmtNaira, imageSrc } from '@/features/listings/model';
import { dealError, MAX_DEAL_DAYS, toLocalDate, useListingEditor } from '@/features/stores/hooks/useListingEditor';
import { formatLocation } from '@/shared/utils/locations';

/**
 * The listing editor, laid out as the sandbox's four-step composer: Photos,
 * Details, Pricing, Review, with the steps down the side and one screen of
 * fields at a time.
 *
 * Everything the single long form had is still here, sorted into the step it
 * belongs to: the category's own attributes and variants, free-form extra
 * details, tags and the item's location. The sandbox's delivery options are
 * not, since nothing ships through the platform; location takes that slot, as
 * where the buyer collects. Save as draft is offered on every step, not only
 * the last, so a draft without photos can still be kept.
 */

const STEPS = ['Photos', 'Details', 'Pricing & location', 'Review'] as const;
const TITLES = ['Add photos', 'Describe the item', 'Price and location', 'Review and publish'];
const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'REFURBISHED', label: 'Refurbished' },
];
const PRICING: Array<{ value: PriceType; label: string }> = [
  { value: 'FIXED', label: 'Fixed price' },
  { value: 'RANGE', label: 'Price range' },
  { value: 'ON_REQUEST', label: 'Contact for price' },
];
const MAX_CUSTOM_FIELDS = 30;
const TITLE_MAX = 100;

/** Which step owns a field, so a rejected save opens where the problem is. */
function stepOf(field: string): number {
  if (field === 'images') return 0;
  if (['basePrice', 'maxPrice', 'priceType', 'compareAtPrice', 'dealEndsAt', 'dealEndsOn', 'variants', 'country', 'state', 'city'].includes(field)) return 2;
  return 1;
}

function Label({ htmlFor, required, aside, children }: { htmlFor?: string; required?: boolean; aside?: ReactNode; children: ReactNode }) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <div className="ws-vxfieldset__top">
      <Tag htmlFor={htmlFor} className="ws-vxlabel">
        {children}
        {required && <span aria-hidden className="ws-vxlabel__req">*</span>}
      </Tag>
      {aside && <span className="ws-vxfieldset__count ws-num">{aside}</span>}
    </div>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="ws-vxerror" role="alert">
      <AlertCircle size={14} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function StepDot({ state, n }: { state: 'done' | 'current' | 'upcoming'; n: number }) {
  return (
    <span className={`ws-vxdot ws-vxdot--${state}`} aria-hidden>
      {state === 'done' ? <Check size={12} strokeWidth={3} /> : n}
    </span>
  );
}

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="ws-vxswitchrow">
      <span>
        <span id={`${id}-l`} className="ws-vxswitchrow__label">{label}</span>
        {description && <span id={`${id}-d`} className="ws-vxswitchrow__desc">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        className={`ws-vxswitch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default function ListingEdit() {
  const ed = useListingEditor();
  const {
    productsBasePath, navigate, isNew, loading, saving, uploading, listing, problems, fieldErrors,
    setFieldErrors, name, setName, description, setDescription, parentId, setParentId, categoryId,
    setCategoryId, priceType, setPriceType, basePrice, setBasePrice, maxPrice, setMaxPrice,
    isNegotiable, setIsNegotiable, onDeal, setOnDeal, compareAtPrice, setCompareAtPrice, dealEndsOn,
    setDealEndsOn, condition, setCondition, country, setCountry, state, setState,
    city, setCity, tags, setTags, images, setImages, attributes, setAttributes, customFields,
    setCustomFields, variants, setVariants, parents, children, productAttrs, variantAttrs,
    handleUpload, save,
  } = ed;

  const formId = useId();
  const uploadId = useId();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const [shake, setShake] = useState(0);
  const [confirmed, setConfirmed] = useState(!isNew);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  // What was loaded, to tell a changed listing from an untouched one.
  const snapshot = JSON.stringify({ name, description, categoryId, priceType, basePrice, maxPrice, isNegotiable, onDeal, compareAtPrice, dealEndsOn, condition, country, state, city, tags, images, attributes, customFields, variants });
  const initial = useRef<string | null>(null);
  if (!loading && initial.current === null) initial.current = snapshot;
  const dirty = initial.current !== null && initial.current !== snapshot;

  const errors = { ...fieldErrors, ...stepErrors };

  const go = (next: number) => {
    setDir(next > step ? 'forward' : 'back');
    setStepErrors({});
    setStep(next);
    setReached((r) => Math.max(r, next));
  };

  // Focus follows the step, so a keyboard or screen reader user lands on it.
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) headingRef.current?.focus({ preventScroll: true });
    moved.current = true;
  }, [step]);

  // A save the hook or the server rejected opens the first step at fault.
  useEffect(() => {
    const fields = Object.keys(fieldErrors);
    if (fields.length === 0) return;
    const target = Math.min(...fields.map(stepOf));
    setDir(target > step ? 'forward' : 'back');
    setStep(target);
    setReached((r) => Math.max(r, target));
    setShake((n) => n + 1);
    // Only when a new set of errors arrives, not as the vendor moves on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  /** The checks a step must pass before Next; the rest wait for Save. */
  const check = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0 && images.length === 0) e.images = 'Add at least one photo.';
    if (s === 1) {
      if (name.trim().length < 3) e.name = name.trim() ? 'Use at least 3 characters so buyers can find it.' : 'Enter a title.';
      if (!parentId) e.category = 'Choose a category.';
      else if (!categoryId) e.category = 'Choose a subcategory.';
      if (description.trim().length < 20) e.description = 'Describe the item in at least 20 characters.';
    }
    if (s === 2) {
      if (priceType !== 'ON_REQUEST' && (basePrice === '' || Number(basePrice) <= 0)) {
        e.basePrice = priceType === 'RANGE' ? 'Enter the lowest price.' : 'Enter a price above zero.';
      }
      if (priceType === 'RANGE') {
        if (maxPrice === '') e.maxPrice = 'Enter the highest price.';
        else if (basePrice !== '' && Number(maxPrice) < Number(basePrice)) e.maxPrice = 'The highest price cannot be below the lowest.';
      }
      const deal = dealError({ priceType, basePrice, onDeal, compareAtPrice, dealEndsOn });
      if (deal) e[deal.field] = deal.message;
    }
    if (s === 3 && !confirmed) e.confirm = 'Confirm the listing follows the community guidelines.';
    return e;
  };

  const next = (ev?: React.FormEvent) => {
    ev?.preventDefault();
    const e = check(step);
    if (Object.keys(e).length) {
      setStepErrors(e);
      setShake((n) => n + 1);
      return;
    }
    if (step < STEPS.length - 1) go(step + 1);
    else void save(true);
  };

  const saveDraft = () => {
    setFieldErrors({});
    void save(false);
  };

  const cancel = () => {
    if (dirty && !saving) setLeaving(true);
    else navigate(productsBasePath);
  };

  const set = <T,>(setter: (v: T) => void, key: string) => (v: T) => {
    setter(v);
    if (stepErrors[key]) {
      setStepErrors((prev) => {
        const rest = { ...prev };
        delete rest[key];
        return rest;
      });
    }
  };

  const moveImage = (i: number, by: -1 | 1) =>
    setImages((prev) => {
      const nextImgs = [...prev];
      [nextImgs[i], nextImgs[i + by]] = [nextImgs[i + by], nextImgs[i]];
      return nextImgs;
    });

  const category = useMemo(() => children.find((c) => c.id === categoryId), [children, categoryId]);
  const parent = useMemo(() => parents.find((c) => c.id === parentId), [parents, parentId]);
  const priceText =
    priceType === 'ON_REQUEST'
      ? 'Contact for price'
      : priceType === 'RANGE'
        ? basePrice && maxPrice ? `${fmtNaira(Number(basePrice))} – ${fmtNaira(Number(maxPrice))}` : 'No price yet'
        : basePrice ? fmtNaira(Number(basePrice)) : 'No price yet';
  const where = formatLocation([city, state], country || undefined) || 'Same as your shop';
  const readOnly = listing?.status === 'REMOVED';
  const label = isNew ? 'New listing' : 'Edit listing';

  if (loading) {
    return (
      <div className="ws-vxpage ws-vxwiz-page">
        <div className="ws-skeleton" style={{ height: 560, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  // ── Steps ──
  const photos = (
    <div className="ws-vxphotos">
      <label
        htmlFor={uploadId}
        className={`ws-vxphotos__drop${dragging ? ' is-over' : ''}${errors.images ? ' is-bad' : ''}${uploading ? ' is-busy' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setStepErrors({});
          void handleUpload(e.dataTransfer.files);
        }}
      >
        <span className="ws-vxphotos__icon"><Upload size={20} aria-hidden /></span>
        <span className="ws-vxphotos__cta">
          {uploading ? 'Uploading…' : dragging ? 'Drop to add' : (
            <>
              <span className="ws-vxphotos__choose">Choose photos</span> or drag them here
            </>
          )}
        </span>
        <span className="ws-vxphotos__hint">JPG or PNG · the first photo is the cover</span>
        <input
          id={uploadId}
          type="file"
          accept="image/*"
          multiple
          className="ws-sr-only"
          disabled={uploading}
          aria-invalid={!!errors.images || undefined}
          onChange={(e) => {
            setStepErrors({});
            void handleUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      <FieldError>{errors.images}</FieldError>

      {images.length > 0 && (
        <>
          <ul className="ws-vxphotos__grid" aria-label="Selected photos">
            {images.map((img, i) => (
              <li key={`${imageSrc(img)}-${i}`} className="ws-vxphotos__item">
                <img src={imageSrc(img)} alt={`Photo ${i + 1}${i === 0 ? ', cover' : ''}`} />
                {i === 0 && <span className="ws-vxphotos__cover">Cover</span>}
                <div className="ws-vxphotos__tools">
                  <span>
                    <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => moveImage(i, -1)}>
                      <ChevronLeft size={14} aria-hidden />
                    </button>
                    <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={i === images.length - 1} onClick={() => moveImage(i, 1)}>
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  </span>
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X size={14} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="ws-vxhint ws-num">{images.length} {images.length === 1 ? 'photo' : 'photos'}</p>
        </>
      )}
    </div>
  );

  const details = (
    <div className="ws-vxwiz__fields">
      <div className="ws-vxfieldset">
        <Label htmlFor={`${formId}-name`} required aside={`${name.length}/${TITLE_MAX}`}>Title</Label>
        <input
          id={`${formId}-name`}
          className="ws-vxinput"
          value={name}
          maxLength={TITLE_MAX}
          placeholder="e.g. iPhone 15 Pro Max 256GB, natural titanium"
          aria-invalid={!!errors.name}
          onChange={(e) => set(setName, 'name')(e.target.value)}
        />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div className="ws-vxwiz__two">
        <div className="ws-vxfieldset">
          <Label htmlFor={`${formId}-parent`} required>Category</Label>
          <select
            id={`${formId}-parent`}
            className="ws-select ws-vxinput ws-vxinput--select"
            value={parentId}
            aria-invalid={!!errors.category && !parentId}
            onChange={(e) => {
              set(setParentId, 'category')(e.target.value);
              setCategoryId('');
              setAttributes({});
            }}
          >
            <option value="">Select category</option>
            {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {parentId && (
          <div className="ws-vxfieldset ws-vxfade">
            <Label htmlFor={`${formId}-cat`} required>Subcategory</Label>
            <select
              id={`${formId}-cat`}
              className="ws-select ws-vxinput ws-vxinput--select"
              value={categoryId}
              aria-invalid={!!errors.category}
              onChange={(e) => {
                set(setCategoryId, 'category')(e.target.value);
                setAttributes({});
              }}
            >
              <option value="">Select subcategory</option>
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <FieldError>{errors.category}</FieldError>

      <div className="ws-vxfieldset">
        <Label>Condition</Label>
        <div className="ws-vxradios" role="radiogroup" aria-label="Condition">
          {CONDITIONS.map((c) => {
            const id = `${formId}-cond-${c.value}`;
            return (
              <span key={c.value} className="ws-cfcheck">
                <input
                  id={id}
                  type="radio"
                  name={`${formId}-cond`}
                  className="ws-cfcheck__box ws-cfcheck__box--radio"
                  checked={condition === c.value}
                  // Clicking the chosen one again clears it: condition is optional.
                  onClick={() => condition === c.value && setCondition('')}
                  onChange={() => setCondition(c.value)}
                />
                <label htmlFor={id}>{c.label}</label>
              </span>
            );
          })}
        </div>
      </div>

      {productAttrs.length > 0 && (
        <div className="ws-vxwiz__group">
          <p className="ws-vxwiz__grouphead">
            {category?.name ?? 'Item'} details
            <span>Buyers filter search results by these, so fill in as many as apply.</span>
          </p>
          <div className="ws-vxwiz__two">
            {productAttrs.map((attr) => {
              const id = `${formId}-attr-${attr.name}`;
              const err = errors[`attr-${attr.name}`];
              return (
                <div className="ws-vxfieldset" key={attr.name}>
                  <Label htmlFor={id} required={attr.isRequired}>{attr.name}</Label>
                  {attr.type === 'SELECT' ? (
                    <select
                      id={id}
                      className="ws-select ws-vxinput ws-vxinput--select"
                      value={attributes[attr.name] ?? ''}
                      aria-invalid={!!err}
                      onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                    >
                      <option value="">Select {attr.name.toLowerCase()}</option>
                      {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      id={id}
                      type={attr.type === 'NUMBER' ? 'number' : 'text'}
                      className="ws-vxinput"
                      value={attributes[attr.name] ?? ''}
                      aria-invalid={!!err}
                      onChange={(e) => setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))}
                    />
                  )}
                  <FieldError>{err}</FieldError>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="ws-vxfieldset">
        <Label htmlFor={`${formId}-desc`} required aside={`${description.length}/5000`}>Description</Label>
        <textarea
          id={`${formId}-desc`}
          className="ws-vxinput ws-vxinput--area"
          rows={4}
          maxLength={5000}
          value={description}
          aria-invalid={!!errors.description}
          placeholder="Tell buyers more: size, fit, flaws, what is in the box."
          onChange={(e) => set(setDescription, 'description')(e.target.value)}
        />
        <FieldError>{errors.description}</FieldError>
      </div>

      <div className="ws-vxfieldset">
        <Label htmlFor={`${formId}-tags`}>Tags</Label>
        <input
          id={`${formId}-tags`}
          className="ws-vxinput"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Comma separated. Helps buyers find this in search"
        />
      </div>

      <div className="ws-vxwiz__group">
        <p className="ws-vxwiz__grouphead">
          Additional details
          <span>Anything the fields above do not cover. Shown on the listing, not used in filters.</span>
        </p>
        {customFields.map((field, i) => (
          <div key={i} className="ws-vxwiz__pair">
            <input
              className="ws-vxinput"
              placeholder="Label, e.g. Warranty"
              aria-label={`Detail ${i + 1} label`}
              value={field.label}
              onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
            />
            <input
              className="ws-vxinput"
              placeholder="Value, e.g. 6 months"
              aria-label={`Detail ${i + 1} value`}
              value={field.value}
              onChange={(e) => setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
            />
            <button
              type="button"
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
              aria-label={`Remove detail ${i + 1}`}
              onClick={() => setCustomFields((f) => f.filter((_, idx) => idx !== i))}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
        {customFields.length < MAX_CUSTOM_FIELDS && (
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--outline ws-vxwiz__add"
            onClick={() => setCustomFields((f) => [...f, { label: '', value: '' }])}
          >
            <Plus size={14} aria-hidden />
            Add detail
          </button>
        )}
      </div>
    </div>
  );

  const pricing = (
    <div className="ws-vxwiz__fields">
      <div className="ws-vxfieldset">
        <Label>Pricing</Label>
        <div className="ws-segmented ws-vxwiz__seg" role="group" aria-label="Pricing">
          {PRICING.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={priceType === p.value}
              className={`ws-segmented__btn${priceType === p.value ? ' is-active' : ''}`}
              onClick={() => {
                setPriceType(p.value);
                setStepErrors({});
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {priceType !== 'ON_REQUEST' && (
        <div className="ws-vxwiz__two ws-vxfade">
          <div className="ws-vxfieldset">
            <Label htmlFor={`${formId}-base`} required>{priceType === 'RANGE' ? 'From' : 'Price'}</Label>
            <div className={`ws-vxmoney${errors.basePrice ? ' is-bad' : ''}`}>
              <span aria-hidden>₦</span>
              <input
                id={`${formId}-base`}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                className="ws-num"
                value={basePrice}
                aria-invalid={!!errors.basePrice}
                onChange={(e) => set(setBasePrice, 'basePrice')(e.target.value)}
              />
            </div>
            <FieldError>{errors.basePrice}</FieldError>
          </div>
          {priceType === 'RANGE' && (
            <div className="ws-vxfieldset">
              <Label htmlFor={`${formId}-max`} required>To</Label>
              <div className={`ws-vxmoney${errors.maxPrice ? ' is-bad' : ''}`}>
                <span aria-hidden>₦</span>
                <input
                  id={`${formId}-max`}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  className="ws-num"
                  value={maxPrice}
                  aria-invalid={!!errors.maxPrice}
                  onChange={(e) => set(setMaxPrice, 'maxPrice')(e.target.value)}
                />
              </div>
              <FieldError>{errors.maxPrice}</FieldError>
            </div>
          )}
        </div>
      )}

      <Switch
        label="Accept offers"
        description="The price is negotiable, and buyers can propose a lower one."
        checked={isNegotiable}
        onChange={setIsNegotiable}
      />

      {/* A deal is the vendor's own: the home page's Deals rail and the
          category "Reduced price" filter show only listings set up here. */}
      {priceType === 'FIXED' && (
        <>
          <Switch
            label="Put on deal"
            description={`Show your price as a reduction, with an end date. Deals appear in the Deals section for up to ${MAX_DEAL_DAYS} days.`}
            checked={onDeal}
            onChange={(on) => {
              setOnDeal(on);
              setStepErrors({});
              // Default to a week, the length most sales run.
              if (on && !dealEndsOn) setDealEndsOn(toLocalDate(new Date(Date.now() + 7 * 86_400_000)));
            }}
          />
          {onDeal && (
            <div className="ws-vxwiz__two ws-vxfade">
              <div className="ws-vxfieldset">
                <Label htmlFor={`${formId}-was`} required>Price before the deal</Label>
                <div className={`ws-vxmoney${errors.compareAtPrice ? ' is-bad' : ''}`}>
                  <span aria-hidden>₦</span>
                  <input
                    id={`${formId}-was`}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    className="ws-num"
                    value={compareAtPrice}
                    aria-invalid={!!errors.compareAtPrice}
                    onChange={(e) => set(setCompareAtPrice, 'compareAtPrice')(e.target.value)}
                  />
                </div>
                <FieldError>{errors.compareAtPrice}</FieldError>
                {compareAtPrice !== '' && basePrice !== '' && Number(compareAtPrice) > Number(basePrice) && (
                  <span className="ws-vxhint ws-num">
                    {Math.round((1 - Number(basePrice) / Number(compareAtPrice)) * 100)}% off, buyers save{' '}
                    {fmtNaira(Number(compareAtPrice) - Number(basePrice))}
                  </span>
                )}
              </div>
              <div className="ws-vxfieldset">
                <Label htmlFor={`${formId}-ends`} required>Deal ends</Label>
                <input
                  id={`${formId}-ends`}
                  type="date"
                  className="ws-vxinput"
                  min={toLocalDate(new Date())}
                  max={toLocalDate(new Date(Date.now() + MAX_DEAL_DAYS * 86_400_000))}
                  value={dealEndsOn}
                  aria-invalid={!!errors.dealEndsOn}
                  onChange={(e) => set(setDealEndsOn, 'dealEndsOn')(e.target.value)}
                />
                <FieldError>{errors.dealEndsOn}</FieldError>
                <span className="ws-vxhint">Runs to the end of that day.</span>
              </div>
            </div>
          )}
        </>
      )}

      {variantAttrs.length > 0 && (
        <div className="ws-vxwiz__group">
          <p className="ws-vxwiz__grouphead">
            Variants
            <span>
              A row per {variantAttrs.map((a) => a.name.toLowerCase()).join(' / ')} you offer. Leave empty if there is
              only one version.
            </span>
          </p>
          <FieldError>{errors.variants}</FieldError>
          {variants.map((variant, i) => (
            <div key={i} className="ws-vxvariant">
              <div className="ws-vxfieldset">
                <Label htmlFor={`${formId}-v${i}`}>Name</Label>
                <input
                  id={`${formId}-v${i}`}
                  className="ws-vxinput"
                  placeholder="e.g. Red / XL"
                  value={variant.name}
                  onChange={(e) => setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                />
              </div>
              {variantAttrs.map((attr) => (
                <div className="ws-vxfieldset" key={attr.name}>
                  <Label htmlFor={`${formId}-v${i}-${attr.name}`} required={attr.isRequired}>{attr.name}</Label>
                  {attr.type === 'SELECT' ? (
                    <select
                      id={`${formId}-v${i}-${attr.name}`}
                      className="ws-select ws-vxinput ws-vxinput--select"
                      value={variant.attributes[attr.name] ?? ''}
                      onChange={(e) =>
                        setVariants((v) => v.map((x, idx) =>
                          idx === i ? { ...x, attributes: { ...x.attributes, [attr.name]: e.target.value } } : x))}
                    >
                      <option value="">Choose</option>
                      {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`${formId}-v${i}-${attr.name}`}
                      className="ws-vxinput"
                      value={variant.attributes[attr.name] ?? ''}
                      onChange={(e) =>
                        setVariants((v) => v.map((x, idx) =>
                          idx === i ? { ...x, attributes: { ...x.attributes, [attr.name]: e.target.value } } : x))}
                    />
                  )}
                </div>
              ))}
              <div className="ws-vxfieldset">
                <Label htmlFor={`${formId}-v${i}-price`}>Price</Label>
                <div className="ws-vxmoney">
                  <span aria-hidden>₦</span>
                  <input
                    id={`${formId}-v${i}-price`}
                    type="number"
                    min="0"
                    className="ws-num"
                    value={variant.price ?? ''}
                    onChange={(e) =>
                      setVariants((v) => v.map((x, idx) =>
                        idx === i ? { ...x, price: e.target.value === '' ? undefined : Number(e.target.value) } : x))}
                  />
                </div>
              </div>
              <div className="ws-vxvariant__end">
                <span className="ws-cfcheck">
                  <input
                    id={`${formId}-v${i}-ok`}
                    type="checkbox"
                    className="ws-cfcheck__box"
                    checked={variant.isAvailable !== false}
                    onChange={(e) => setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, isAvailable: e.target.checked } : x)))}
                  />
                  <label htmlFor={`${formId}-v${i}-ok`}>Available</label>
                </span>
                <button
                  type="button"
                  className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost"
                  onClick={() => setVariants((v) => v.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--outline ws-vxwiz__add"
            onClick={() => setVariants((v) => [...v, { name: '', attributes: {}, isAvailable: true }])}
          >
            <Plus size={14} aria-hidden />
            Add variant
          </button>
        </div>
      )}

      <div className="ws-vxwiz__group">
        <p className="ws-vxwiz__grouphead">
          Where the item is
          <span>Leave blank to use your shop's location. Buyers browse by it.</span>
        </p>
        <div className="ws-vxwiz__two">
          <div className="ws-vxfieldset">
            <Label htmlFor={`${formId}-country`}>Country</Label>
            <CountrySelect
              id={`${formId}-country`}
              className="ws-select ws-vxinput ws-vxinput--select"
              value={country}
              placeholder="Same as my shop"
              onChange={(e) => { setCountry(e.target.value); setState(''); }}
            />
          </div>
          <div className="ws-vxfieldset">
            <Label htmlFor={`${formId}-state`}>State / region</Label>
            <StateSelect
              id={`${formId}-state`}
              className="ws-select ws-vxinput ws-vxinput--select"
              country={country}
              value={state}
              placeholder="Same as my shop"
              onChange={(e) => setState(e.target.value)}
            />
          </div>
          <div className="ws-vxfieldset">
            <Label htmlFor={`${formId}-city`}>City / area</Label>
            <input id={`${formId}-city`} className="ws-vxinput" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />
          </div>
        </div>
      </div>

      <p className="ws-vxsummary">
        <span>Buyers see: </span>
        {priceText}
        {isNegotiable && priceType !== 'ON_REQUEST' ? ', negotiable' : ''} · {where}
      </p>
    </div>
  );

  const section = (title: string, to: number, body: ReactNode) => (
    <section className="ws-vxreviewbox">
      <div className="ws-vxreviewbox__head">
        <h4>{title}</h4>
        <button type="button" className="ws-vxreviewbox__edit" onClick={() => go(to)}>
          Edit<span className="ws-sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      {body}
    </section>
  );

  const cover = images[0] ? imageSrc(images[0]) : null;
  const review = (
    <div className="ws-vxwiz__fields ws-vxwiz__fields--tight">
      <div className="ws-vxpreview">
        <div className="ws-vxpreview__img">
          {cover ? <img src={cover} alt="Cover photo" /> : <ImageOff size={40} aria-hidden />}
        </div>
        <div className="ws-vxpreview__text">
          <p className="ws-vxpreview__title">{name || 'Untitled listing'}</p>
          <p className="ws-vxpreview__price ws-num">{priceText}</p>
          <p className="ws-vxpreview__line">{where}</p>
          <p className="ws-vxpreview__meta">
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
            {variants.length ? ` · ${variants.length} ${variants.length === 1 ? 'variant' : 'variants'}` : ''}
            {isNegotiable ? ' · Offers on' : ''}
          </p>
        </div>
      </div>

      {section('Photos', 0, images.length ? (
        <div className="ws-vxreviewbox__thumbs">
          {images.map((img, i) => <img key={i} src={imageSrc(img)} alt="" />)}
        </div>
      ) : <p className="ws-vxhint">No photos yet. Publishing needs at least one.</p>)}

      {section('Details', 1, (
        <>
          <dl className="ws-vxminidl">
            <div><dt>Category</dt><dd>{[parent?.name, category?.name].filter(Boolean).join(' › ') || '—'}</dd></div>
            <div><dt>Condition</dt><dd>{CONDITIONS.find((c) => c.value === condition)?.label ?? 'Not specified'}</dd></div>
            {Object.entries(attributes).filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
            {tags && <div><dt>Tags</dt><dd>{tags}</dd></div>}
          </dl>
          {description && (
            <p className="ws-vxreviewbox__quote">
              {description.length > 100 ? `${description.slice(0, 100)}…` : description}
            </p>
          )}
        </>
      ))}

      {section('Pricing & location', 2, (
        <dl className="ws-vxminidl">
          <div><dt>Price</dt><dd>{priceText}</dd></div>
          <div><dt>Offers</dt><dd>{isNegotiable ? 'Accepted' : 'Off'}</dd></div>
          <div><dt>Location</dt><dd>{where}</dd></div>
        </dl>
      ))}

      <span className="ws-cfcheck ws-vxwiz__confirm">
        <input
          id={`${formId}-ok`}
          type="checkbox"
          className="ws-cfcheck__box"
          checked={confirmed}
          aria-invalid={!!errors.confirm}
          onChange={(e) => {
            setConfirmed(e.target.checked);
            if (e.target.checked) setStepErrors({});
          }}
        />
        <label htmlFor={`${formId}-ok`}>
          This listing follows the WorldStore community guidelines
          <span aria-hidden className="ws-vxlabel__req">*</span>
        </label>
      </span>
      <FieldError>{errors.confirm}</FieldError>
    </div>
  );

  const body = [photos, details, pricing, review][step];

  const steps = (
    <ol aria-label="Listing steps" className="ws-vxsteps">
      {STEPS.map((s, i) => {
        const st = i < step ? 'done' : i === step ? 'current' : 'upcoming';
        return (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <button type="button" disabled={i > reached || saving} onClick={() => go(i)} className={`ws-vxsteps__btn is-${st}`}>
              <StepDot state={st} n={i + 1} />
              <span>{s}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="ws-vxpage ws-vxwiz-page">
      <div className="ws-vxwiz-page__top">
        <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost" onClick={cancel}>
          <ArrowLeft size={16} aria-hidden />
          Back
        </button>
        <span className="ws-vxhint">Drafts are only visible to you</span>
      </div>

      <div className="ws-vxwiz">
        <aside className="ws-vxwiz__side">
          <p className="ws-vxwiz__eyebrow">{label}</p>
          {steps}
        </aside>

        <div className="ws-vxwiz__main">
          <div className="ws-vxwiz__progress">
            <div className="ws-vxwiz__progresshead">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="ws-vxwiz__bar" aria-hidden>
              {STEPS.map((s, i) => <span key={s} className={i <= step ? 'is-on' : undefined} />)}
            </div>
          </div>

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
                  <ul className="ws-vxwiz__problems">
                    {problems.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </span>
              )}
            </div>
          )}

          <form id={formId} noValidate onSubmit={next} className="ws-vxwiz__form">
            <fieldset disabled={readOnly} data-dir={dir} className="ws-vxwiz__step" key={step}>
              <legend className="ws-sr-only">{STEPS[step]}</legend>
              <div className="ws-vxwiz__head">
                <h3 ref={headingRef} tabIndex={-1}>{TITLES[step]}</h3>
                {step < 3 && (
                  <p className="ws-vxhint">
                    <span aria-hidden className="ws-vxlabel__req">*</span> Required
                  </p>
                )}
              </div>
              <div className={shake ? 'ws-vxshake' : undefined} key={shake}>
                {body}
              </div>
            </fieldset>
          </form>

          <div className="ws-vxwiz__foot">
            {step > 0 ? (
              <button type="button" className="ws-ldbtn ws-ldbtn--outline" onClick={() => go(step - 1)} disabled={saving}>
                <ArrowLeft size={18} aria-hidden />
                Back
              </button>
            ) : (
              <button type="button" className="ws-ldbtn ws-ldbtn--ghost" onClick={cancel}>
                Cancel
              </button>
            )}
            <span className="ws-vxwiz__spacer" />
            <button
              type="button"
              className={`ws-ldbtn ${step === STEPS.length - 1 ? 'ws-ldbtn--outline' : 'ws-ldbtn--ghost'}`}
              disabled={saving || readOnly}
              onClick={saveDraft}
            >
              {saving ? 'Saving…' : 'Save as draft'}
            </button>
            {step === STEPS.length - 1 ? (
              <button type="submit" form={formId} className="ws-ldbtn ws-ldbtn--primary" disabled={saving || readOnly}>
                {saving ? 'Publishing…' : isNew ? 'Publish listing' : 'Update and publish'}
              </button>
            ) : (
              <button type="submit" form={formId} className="ws-ldbtn ws-ldbtn--primary" disabled={uploading}>
                Next
                <ArrowRight size={18} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={leaving}
        onClose={() => setLeaving(false)}
        title={isNew ? 'Discard this listing?' : 'Discard your changes?'}
        footer={
          <div className="ws-cxsheet__foot">
            <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost" onClick={() => setLeaving(false)}>
              Keep editing
            </button>
            <button
              type="button"
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline"
              onClick={() => {
                setLeaving(false);
                saveDraft();
              }}
            >
              Save as draft
            </button>
            <Link to={productsBasePath} className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--danger">
              Discard
            </Link>
          </div>
        }
      >
        <p className="ws-vxhint">
          {isNew
            ? 'Your photos and details have not been saved. Save it as a draft to finish later.'
            : 'Your edits have not been saved. Save them as a draft to finish later.'}
        </p>
      </Modal>
    </div>
  );
}
