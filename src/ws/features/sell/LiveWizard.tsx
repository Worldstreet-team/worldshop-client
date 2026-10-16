"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, CheckCircleIcon, InfoCircleIcon, PlusCircleIcon, TrashIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { ListingCard } from "@ws/features/listing-card/ListingCard";
import { previewCard, type Row } from "@ws/lib/data/api";
import { imageSrc, type ImageRef } from "@/features/listings/model";
import type { PriceType, VendorDashboard } from "@/features/stores/api";
import { dealError, lastDealDay, toLocalDate, useListingEditor } from "@/features/stores/hooks/useListingEditor";
import CountrySelect from "@/shared/components/location/CountrySelect";
import StateSelect from "@/shared/components/location/StateSelect";
import { useVendorDashboard } from "./live";

/*
 * CreateListingWizard (ListingWizard.tsx) on the listing API, through the same editor
 * hook the mall console's product pages use, so a listing saves and publishes by one set
 * of rules wherever it is written.
 *
 * Steps that differ from the reference, and why:
 * - Delivery and Returns are one step, Location: nothing ships through WorldStore, so
 *   what a buyer needs is where the item is. The reference's courier fees, package size
 *   and return windows have nowhere to be stored.
 * - Item specifics are the category's own attributes from the API, not a fixed table,
 *   and variants appear where a category defines per-variant attributes.
 * - Prices are whole naira and can be fixed, a range, or "Contact for price".
 * - A draft is saved to the shop, not the device, so it needs the basics first: a title,
 *   a description and a category, which is what the server asks of any listing.
 */

type Editor = ReturnType<typeof useListingEditor>;

const STEPS = ["Photos", "Details", "Title", "Price", "Location", "Review"] as const;
const TITLES = ["Add photos", "Category and details", "Title and description", "Price and offers", "Where the item is", "Review and publish"];
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5_000;
const PHOTOS_MAX = 12;
const CUSTOM_MAX = 30;

const CONDITIONS = [
  { value: "NEW", label: "New", help: "Unused, unopened, in the original packaging." },
  { value: "USED", label: "Used", help: "Has been used; may show wear. Say how in the description." },
  { value: "REFURBISHED", label: "Refurbished", help: "Restored to working order by the maker or a repairer." },
];
const PRICING: { value: PriceType; label: string; help: string }[] = [
  { value: "FIXED", label: "Fixed price", help: "One price. Buyers can still make an offer if you accept them." },
  { value: "RANGE", label: "Price range", help: "For items that vary, like sizes or bundles." },
  { value: "ON_REQUEST", label: "Contact for price", help: "Buyers message you for a quote." },
];

/** The step a field belongs to, so a rejected save opens where the problem is. */
function stepOf(field: string) {
  if (field === "images") return 1;
  if (field === "category" || field === "condition" || field === "customFields" || field.startsWith("attr-")) return 2;
  if (field === "name" || field === "description" || field === "tags") return 3;
  if (["priceType", "basePrice", "maxPrice", "compareAtPrice", "dealEndsOn", "dealEndsAt", "variants"].includes(field)) return 4;
  if (["country", "state", "city"].includes(field)) return 5;
  return 6;
}

const digits = (text: string) => text.replace(/[^\d]/g, "");

export function ListingWizard() {
  const ed = useListingEditor();
  const dashboard = useVendorDashboard();
  if (ed.loading) return <p className="ws-sell-loading" role="status">Loading your listing…</p>;
  if (!ed.isNew && !ed.listing)
    return (
      <section className="ws-sell-empty">
        <h1>Listing not found</h1>
        <p>It may have been deleted, or it belongs to another shop.</p>
        <Link className={buttonClass({})} href="/sell/new">
          Start a new listing
        </Link>
      </section>
    );
  return <Wizard ed={ed} store={dashboard.data?.store} />;
}

function Wizard({ ed, store }: { ed: Editor; store?: VendorDashboard["store"] }) {
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(ed.isNew ? 1 : STEPS.length);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(!ed.isNew);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const errors: Record<string, string> = { ...ed.fieldErrors, ...stepErrors };

  // A country is asked of every listing; start where the shop is.
  const { country, setCountry, state, setState, city, setCity } = ed;
  useEffect(() => {
    if (ed.isNew && store && !country) {
      setCountry(store.country);
      if (!state) setState(store.state);
      if (!city && store.city) setCity(store.city);
    }
  }, [ed.isNew, store, country, state, city, setCountry, setState, setCity]);

  const go = (next: number) => {
    setStepErrors({});
    setStep(next);
    setReached((r) => Math.max(r, next));
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo({ top: 0 });
    });
  };

  // A save the hook or the server rejected opens the first step at fault, once per new
  // set of errors (set while rendering, so the step and its errors arrive together).
  const { fieldErrors } = ed;
  const [handled, setHandled] = useState(fieldErrors);
  if (handled !== fieldErrors) {
    setHandled(fieldErrors);
    const fields = Object.keys(fieldErrors);
    if (fields.length) setStep(Math.min(...fields.map(stepOf)));
  }
  useEffect(() => {
    if (Object.keys(fieldErrors).length) requestAnimationFrame(() => summary.current?.focus());
  }, [fieldErrors]);

  /** The checks a step must pass before Continue; the server has the last word on Publish. */
  const check = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1 && !ed.images.length) e.images = "Add at least one photo.";
    if (s === 2) {
      if (!ed.parentId) e.category = "Choose a category.";
      else if (!ed.categoryId) e.category = "Choose a subcategory.";
      for (const attr of ed.productAttrs) if (attr.isRequired && !(ed.attributes[attr.name] ?? "").trim()) e[`attr-${attr.name}`] = `Enter the ${attr.name.toLowerCase()}.`;
    }
    if (s === 3) {
      if (ed.name.trim().length < 3) e.name = ed.name.trim() ? "Use at least 3 characters so buyers can find it." : "Write a title.";
      if (ed.description.trim().length < 20) e.description = "Describe the item in at least 20 characters.";
    }
    if (s === 4) {
      if (ed.priceType !== "ON_REQUEST" && (ed.basePrice === "" || Number(ed.basePrice) <= 0)) e.basePrice = ed.priceType === "RANGE" ? "Enter the lowest price." : "Enter a price above ₦0.";
      if (ed.priceType === "RANGE") {
        if (ed.maxPrice === "") e.maxPrice = "Enter the highest price.";
        else if (ed.basePrice !== "" && Number(ed.maxPrice) < Number(ed.basePrice)) e.maxPrice = "The highest price can't be below the lowest.";
      }
      const deal = dealError(ed);
      if (deal) e[deal.field] = deal.message;
    }
    if (s === 5 && !ed.country) e.country = "Choose the country the item is in.";
    if (s === 6 && !confirmed) e.confirm = "Confirm the listing follows the community guidelines.";
    return e;
  };

  const proceed = () => {
    const e = check(step);
    if (Object.keys(e).length) {
      setStepErrors(e);
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    if (step < STEPS.length) go(step + 1);
    else void ed.save(true);
  };

  const shown = Object.entries(errors).filter(([field]) => step === 6 || stepOf(field) === step || field === "confirm");
  const live = ed.listing?.status === "PUBLISHED";
  return (
    <div className="ws-flow">
      <header className="ws-flow__head">
        <div>
          <p className="ws-sell-eyebrow">
            {ed.isNew ? "Create a listing" : live ? "Edit listing" : "Finish your draft"} · Step {step} of {STEPS.length}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {TITLES[step - 1]}
          </h1>
        </div>
        <p className="ws-sell-saved" role="status">
          {ed.saving ? "Saving…" : ed.isNew ? "Not saved yet" : live ? "Live on WorldStore" : "Draft saved to your shop"}
        </p>
      </header>

      <nav aria-label="Listing steps" className="ws-stepper">
        <ol>
          {STEPS.map((label, index) => {
            const n = index + 1;
            const bad = Object.keys(errors).some((f) => stepOf(f) === n);
            return (
              <li key={label}>
                <button type="button" aria-current={step === n ? "step" : undefined} data-done={(n < reached && !bad) || undefined} data-error={bad || undefined} disabled={n > reached} onClick={() => go(n)}>
                  <span aria-hidden="true">{n}</span>
                  {label}
                  {bad && <span className="cx-sr-only"> (needs attention)</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {(shown.length > 0 || (step === 6 && ed.problems?.length)) && (
        <div ref={summary} tabIndex={-1} role="alert" className="ws-sell-alert">
          <strong>{step === 6 ? "Fix these before publishing" : "Check this step"}</strong>
          <ul>
            {(step === 6 && ed.problems?.length ? ed.problems : shown.map(([, m]) => m)).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="ws-flow__body"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          proceed();
        }}
      >
        {step === 1 && <PhotosStep ed={ed} error={errors.images} />}
        {step === 2 && <DetailsStep ed={ed} errors={errors} />}
        {step === 3 && <TitleStep ed={ed} errors={errors} />}
        {step === 4 && <PriceStep ed={ed} errors={errors} />}
        {step === 5 && <LocationStep ed={ed} errors={errors} />}
        {step === 6 && <ReviewStep ed={ed} store={store} confirmed={confirmed} setConfirmed={setConfirmed} error={errors.confirm} />}
        <div className="ws-flow__actions">
          {step > 1 && (
            <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => go(step - 1)}>
              <ArrowLeftIcon />
              Back
            </button>
          )}
          {!live && (
            <button type="button" className={buttonClass({ variant: "quiet" })} disabled={ed.saving} onClick={() => void ed.save(false)}>
              Save draft
            </button>
          )}
          <button type="submit" className={buttonClass({ arrow: step < STEPS.length })} disabled={ed.saving || ed.uploading}>
            {step < STEPS.length ? "Continue" : ed.saving ? "Publishing…" : live ? "Save changes" : "Publish listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, error, count, children }: { label: string; hint?: ReactNode; error?: string; count?: string; children: (a: { id: string; describedBy?: string; invalid?: true }) => ReactNode }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="ws-form-field" data-invalid={error ? true : undefined}>
      <div className="ws-form-field__label">
        <label htmlFor={id}>{label}</label>
        {count && <span aria-live="polite">{count}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="ws-form-field__hint">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: error ? true : undefined })}
      {error && (
        <p id={`${id}-error`} className="ws-form-field__error">
          <WarningIcon />
          {error}
        </p>
      )}
    </div>
  );
}

const Problem = ({ children }: { children?: string }) =>
  children ? (
    <p className="ws-form-field__error">
      <WarningIcon />
      {children}
    </p>
  ) : null;

function PhotosStep({ ed, error }: { ed: Editor; error?: string }) {
  const [over, setOver] = useState(false);
  const room = PHOTOS_MAX - ed.images.length;
  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const take = new DataTransfer();
    [...files].filter((f) => f.type.startsWith("image/")).slice(0, room).forEach((f) => take.items.add(f));
    void ed.handleUpload(take.files);
  };
  const move = (from: number, to: number) =>
    ed.setImages((all) => {
      const next = [...all];
      const [img] = next.splice(from, 1);
      next.splice(to, 0, img);
      return next;
    });
  return (
    <div className="ws-sell-step">
      <p className="ws-sell-lede">Add the front, the back and any damage. The first photo is the cover. Up to {PHOTOS_MAX}; listings with 4 or more get more messages.</p>
      <label
        className="ws-dropzone"
        data-over={over || undefined}
        data-invalid={error ? true : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
      >
        <CameraIcon />
        <strong>{ed.images.length ? "Add more photos" : "Add photos"}</strong>
        <span>Take photos or choose from your device · JPEG, PNG or WebP</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={room <= 0 || ed.uploading}
          className="cx-sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p className="ws-form-field__hint" role="status">
        {ed.uploading ? "Uploading…" : `${ed.images.length} of ${PHOTOS_MAX} photos`}
      </p>
      <Problem>{error}</Problem>
      {ed.images.length > 0 && (
        <ol className="ws-photo-grid">
          {(ed.images as ImageRef[]).map((img, index) => (
            <li key={`${imageSrc(img)}-${index}`}>
              <img src={imageSrc(img)} alt={`Photo ${index + 1}${index === 0 ? " (cover)" : ""}`} />
              {index === 0 && <span className="ws-photo-grid__cover">Cover</span>}
              <div className="ws-photo-grid__tools">
                <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}>
                  <ArrowLeftIcon />
                </button>
                <button type="button" disabled={index === ed.images.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move photo ${index + 1} later`}>
                  <ArrowRightIcon />
                </button>
                <button type="button" onClick={() => ed.setImages((all) => all.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DetailsStep({ ed, errors }: { ed: Editor; errors: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const parents = ed.parents.filter((c) => !q || c.name.toLowerCase().includes(q));
  return (
    <div className="ws-sell-step">
      <fieldset className="ws-fieldset" data-invalid={errors.category ? true : undefined}>
        <legend>Category</legend>
        <input type="search" className="ws-input" placeholder="Find a category" aria-label="Find a category" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="ws-choice-grid">
          {parents.map((c) => (
            <label key={c.id} className="ws-choice">
              <input
                type="radio"
                name="department"
                checked={ed.parentId === c.id}
                onChange={() => {
                  ed.setParentId(c.id);
                  ed.setCategoryId("");
                  ed.setAttributes({});
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
        {!parents.length && <p className="ws-form-field__hint">{ed.parents.length ? `No category matches “${query}”.` : "Loading categories…"}</p>}
      </fieldset>
      {ed.parentId && (
        <fieldset className="ws-fieldset" data-invalid={errors.category ? true : undefined}>
          <legend>Subcategory</legend>
          <div className="ws-choice-grid">
            {ed.children.map((c) => (
              <label key={c.id} className="ws-choice">
                <input
                  type="radio"
                  name="category"
                  checked={ed.categoryId === c.id}
                  onChange={() => {
                    ed.setCategoryId(c.id);
                    ed.setAttributes({});
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Problem>{errors.category}</Problem>

      {ed.productAttrs.length > 0 && (
        <fieldset className="ws-fieldset">
          <legend>Item specifics</legend>
          <p className="ws-form-field__hint">Buyers filter on these, so fill in as many as you can.</p>
          <div className="ws-form-grid">
            {ed.productAttrs.map((attr) => (
              <Field key={attr.name} label={`${attr.name}${attr.isRequired ? "" : " (optional)"}`} error={errors[`attr-${attr.name}`]}>
                {({ id, describedBy, invalid }) =>
                  attr.type === "SELECT" && attr.options.length ? (
                    <select id={id} className="ws-input" value={ed.attributes[attr.name] ?? ""} onChange={(e) => ed.setAttributes((a) => ({ ...a, [attr.name]: e.target.value }))} aria-describedby={describedBy} aria-invalid={invalid}>
                      <option value="">Choose</option>
                      {attr.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input id={id} className="ws-input" inputMode={attr.type === "NUMBER" ? "decimal" : undefined} value={ed.attributes[attr.name] ?? ""} onChange={(e) => ed.setAttributes((a) => ({ ...a, [attr.name]: e.target.value.slice(0, 80) }))} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />
                  )
                }
              </Field>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="ws-fieldset">
        <legend>Condition</legend>
        <div className="ws-choice-list">
          {CONDITIONS.map((c) => (
            <label key={c.value} className="ws-choice">
              <input type="radio" name="condition" checked={ed.condition === c.value} onChange={() => ed.setCondition(c.value)} />
              <span>
                <strong>{c.label}</strong>
                <small>{c.help}</small>
              </span>
            </label>
          ))}
        </div>
        {ed.condition && (
          <button type="button" className="ws-sell-link" onClick={() => ed.setCondition("")}>
            Clear condition (for services and property)
          </button>
        )}
      </fieldset>

      <CustomFields ed={ed} />
    </div>
  );
}

/** The seller's own extra details ("Warranty: 6 months"). Shown on the listing, never filterable. */
function CustomFields({ ed }: { ed: Editor }) {
  const set = (i: number, patch: { label?: string; value?: string }) => ed.setCustomFields((all) => all.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <fieldset className="ws-fieldset">
      <legend>More details (optional)</legend>
      <p className="ws-form-field__hint">Anything else buyers ask about: warranty, what's in the box, size of a room.</p>
      {ed.customFields.map((f, i) => (
        <div key={i} className="ws-form-grid">
          <Field label={`Detail ${i + 1}`}>{({ id }) => <input id={id} className="ws-input" placeholder="e.g. Warranty" value={f.label} maxLength={40} onChange={(e) => set(i, { label: e.target.value })} />}</Field>
          <Field label="Value">
            {({ id }) => (
              <span style={{ display: "flex", gap: "var(--cx-s-2)" }}>
                <input id={id} className="ws-input" placeholder="e.g. 6 months" value={f.value} maxLength={120} onChange={(e) => set(i, { value: e.target.value })} />
                <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label={`Remove detail ${i + 1}`} onClick={() => ed.setCustomFields((all) => all.filter((_, j) => j !== i))}>
                  <TrashIcon />
                </button>
              </span>
            )}
          </Field>
        </div>
      ))}
      {ed.customFields.length < CUSTOM_MAX && (
        <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => ed.setCustomFields((all) => [...all, { label: "", value: "" }])}>
          <PlusCircleIcon />
          Add a detail
        </button>
      )}
    </fieldset>
  );
}

function TitleStep({ ed, errors }: { ed: Editor; errors: Record<string, string> }) {
  return (
    <div className="ws-sell-step">
      <Field label="Title" hint="Brand, model and key feature, e.g. “iPhone 13 128GB Midnight, battery 88%”." error={errors.name} count={`${ed.name.length}/${TITLE_MAX}`}>
        {({ id, describedBy, invalid }) => <input id={id} className="ws-input" value={ed.name} maxLength={TITLE_MAX} onChange={(e) => ed.setName(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}
      </Field>
      {/[A-Z]{4,}/.test(ed.name) && ed.name === ed.name.toUpperCase() && (
        <p className="ws-sell-tip">
          <WarningIcon />
          Avoid ALL CAPS: buyers find sentence case easier to read.
        </p>
      )}
      <Field label="Description" hint="Say what's included, any flaws, and why you're selling. New lines become paragraphs." error={errors.description} count={`${ed.description.length.toLocaleString("en-NG")}/${DESCRIPTION_MAX.toLocaleString("en-NG")}`}>
        {({ id, describedBy, invalid }) => <textarea id={id} className="ws-input" rows={8} value={ed.description} maxLength={DESCRIPTION_MAX} onChange={(e) => ed.setDescription(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field label="Search tags (optional)" hint="Separate with commas: other words buyers might search for.">
        {({ id, describedBy }) => <input id={id} className="ws-input" value={ed.tags} onChange={(e) => ed.setTags(e.target.value)} aria-describedby={describedBy} placeholder="e.g. smartphone, apple, unlocked" autoComplete="off" />}
      </Field>
    </div>
  );
}

function PriceStep({ ed, errors }: { ed: Editor; errors: Record<string, string> }) {
  return (
    <div className="ws-sell-step">
      <fieldset className="ws-fieldset">
        <legend>Pricing</legend>
        <div className="ws-choice-list">
          {PRICING.map((p) => (
            <label key={p.value} className="ws-choice">
              <input type="radio" name="pricing" checked={ed.priceType === p.value} onChange={() => ed.setPriceType(p.value)} />
              <span>
                <strong>{p.label}</strong>
                <small>{p.help}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {ed.priceType !== "ON_REQUEST" && (
        <div className="ws-form-grid">
          <Field label={ed.priceType === "RANGE" ? "Lowest price (₦)" : "Price (₦)"} error={errors.basePrice}>
            {({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={ed.basePrice} onChange={(e) => ed.setBasePrice(digits(e.target.value))} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}
          </Field>
          {ed.priceType === "RANGE" && (
            <Field label="Highest price (₦)" error={errors.maxPrice}>
              {({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={ed.maxPrice} onChange={(e) => ed.setMaxPrice(digits(e.target.value))} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}
            </Field>
          )}
        </div>
      )}

      <fieldset className="ws-fieldset">
        <legend>Offers</legend>
        <label className="ws-switch">
          <input type="checkbox" role="switch" checked={ed.isNegotiable} onChange={(e) => ed.setIsNegotiable(e.target.checked)} />
          <span>
            <strong>Accept offers</strong>
            <small>Buyers can make an offer in chat. You accept, counter or decline there.</small>
          </span>
        </label>
      </fieldset>

      {ed.priceType === "FIXED" && (
        <fieldset className="ws-fieldset">
          <legend>Deal</legend>
          <label className="ws-switch">
            <input type="checkbox" role="switch" checked={ed.onDeal} onChange={(e) => ed.setOnDeal(e.target.checked)} />
            <span>
              <strong>Run a deal</strong>
              <small>Shows your earlier price crossed out until the deal ends, at most 30 days.</small>
            </span>
          </label>
          {ed.onDeal && (
            <div className="ws-form-grid">
              <Field label="Price before the deal (₦)" error={errors.compareAtPrice}>
                {({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={ed.compareAtPrice} onChange={(e) => ed.setCompareAtPrice(digits(e.target.value))} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}
              </Field>
              <Field label="Deal ends on" error={errors.dealEndsOn}>
                {({ id, describedBy, invalid }) => <input id={id} type="date" className="ws-input" min={toLocalDate(new Date())} max={lastDealDay()} value={ed.dealEndsOn} onChange={(e) => ed.setDealEndsOn(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
              </Field>
            </div>
          )}
        </fieldset>
      )}

      {ed.variantAttrs.length > 0 && <Variants ed={ed} error={errors.variants} />}
    </div>
  );
}

/** Per-variant attributes the category defines (sizes, colours), each with its own price if it differs. */
function Variants({ ed, error }: { ed: Editor; error?: string }) {
  const set = (i: number, patch: Partial<Editor["variants"][number]>) => ed.setVariants((all) => all.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <fieldset className="ws-fieldset" data-invalid={error ? true : undefined}>
      <legend>Variants (optional)</legend>
      <p className="ws-form-field__hint">Add one for each {ed.variantAttrs.map((a) => a.name.toLowerCase()).join(" and ")} you have.</p>
      {ed.variants.map((v, i) => (
        <div key={i} className="ws-sell-card">
          <div className="ws-sell-card__head">
            <h3>Variant {i + 1}</h3>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label={`Remove variant ${i + 1}`} onClick={() => ed.setVariants((all) => all.filter((_, j) => j !== i))}>
              <TrashIcon />
            </button>
          </div>
          <div className="ws-form-grid">
            {ed.variantAttrs.map((attr) => (
              <Field key={attr.name} label={`${attr.name}${attr.isRequired ? "" : " (optional)"}`}>
                {({ id }) =>
                  attr.type === "SELECT" && attr.options.length ? (
                    <select id={id} className="ws-input" value={v.attributes[attr.name] ?? ""} onChange={(e) => set(i, { attributes: { ...v.attributes, [attr.name]: e.target.value }, name: Object.values({ ...v.attributes, [attr.name]: e.target.value }).filter(Boolean).join(" / ") })}>
                      <option value="">Choose</option>
                      {attr.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input id={id} className="ws-input" value={v.attributes[attr.name] ?? ""} onChange={(e) => set(i, { attributes: { ...v.attributes, [attr.name]: e.target.value }, name: Object.values({ ...v.attributes, [attr.name]: e.target.value }).filter(Boolean).join(" / ") })} />
                  )
                }
              </Field>
            ))}
            <Field label="Price if different (₦)">{({ id }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={v.price != null ? String(v.price) : ""} onChange={(e) => set(i, { price: digits(e.target.value) ? Number(digits(e.target.value)) : undefined })} />}</Field>
          </div>
        </div>
      ))}
      <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => ed.setVariants((all) => [...all, { name: "", attributes: {}, isAvailable: true }])}>
        <PlusCircleIcon />
        Add a variant
      </button>
      <Problem>{error}</Problem>
    </fieldset>
  );
}

function LocationStep({ ed, errors }: { ed: Editor; errors: Record<string, string> }) {
  return (
    <div className="ws-sell-step">
      <p className="ws-sell-lede">Where buyers collect the item or meet you. Nothing ships through WorldStore, so this is what a buyer near you searches by. Only the city and state are shown.</p>
      <div className="ws-form-grid">
        <Field label="Country" error={errors.country}>
          {({ id }) => (
            <CountrySelect
              id={id}
              className="ws-input"
              value={ed.country}
              onChange={(e) => {
                ed.setCountry(e.target.value);
                ed.setState("");
              }}
            />
          )}
        </Field>
        <Field label="State" error={errors.state}>{({ id }) => <StateSelect id={id} className="ws-input" country={ed.country} value={ed.state} onChange={(e) => ed.setState(e.target.value)} />}</Field>
        <Field label="City or area (optional)" error={errors.city}>{({ id }) => <input id={id} className="ws-input" value={ed.city} maxLength={60} onChange={(e) => ed.setCity(e.target.value)} placeholder="e.g. Ikeja" autoComplete="address-level2" />}</Field>
      </div>
    </div>
  );
}

function ReviewStep({ ed, store, confirmed, setConfirmed, error }: { ed: Editor; store?: VendorDashboard["store"]; confirmed: boolean; setConfirmed: (v: boolean) => void; error?: string }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [now] = useState(() => Date.now());
  const category = ed.children.find((c) => c.id === ed.categoryId);
  const checks = [
    { ok: ed.images.length > 0, text: ed.images.length ? `${ed.images.length} photo${ed.images.length > 1 ? "s" : ""}` : "Add at least one photo" },
    { ok: !!ed.categoryId, text: category ? `In ${category.name}` : "Choose a category" },
    { ok: ed.name.trim().length >= 3 && ed.description.trim().length >= 20, text: "Title and description" },
    { ok: ed.priceType === "ON_REQUEST" || Number(ed.basePrice) > 0, text: ed.priceType === "ON_REQUEST" ? "Contact for price" : "Price set" },
    { ok: !!ed.country, text: [ed.city, ed.state].filter(Boolean).join(", ") || "Where the item is" },
  ];
  const tips = [
    ...(ed.images.length > 0 && ed.images.length < 4 ? ["Listings with 4 or more photos (front, back, any damage) get more messages."] : []),
    ...(ed.productAttrs.some((a) => !a.isRequired && !ed.attributes[a.name]) ? ["Some optional item specifics are empty. Buyers filter on them."] : []),
  ];

  return (
    <div className="ws-sell-review">
      <section className="ws-sell-card" aria-labelledby="preview-title">
        <div className="ws-sell-card__head">
          <h2 id="preview-title">Preview</h2>
          <div role="group" aria-label="Preview layout" className="ws-segment">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                {v === "grid" ? "Card" : "List"}
              </button>
            ))}
          </div>
        </div>
        <div className="ws-preview" data-view={view} inert>
          <ListingCard listing={previewCard(toRow(ed, store, now), category?.name ?? "Other")} variant={view} now={now} />
        </div>
        <p className="ws-form-field__hint">This is how buyers see your listing in search.</p>
      </section>
      <section className="ws-sell-card" aria-labelledby="check-title">
        <h2 id="check-title">Checklist</h2>
        <ul className="ws-checklist">
          {checks.map((c) => (
            <li key={c.text} data-ok={c.ok || undefined} data-block={!c.ok || undefined}>
              {c.ok ? <CheckCircleIcon /> : <WarningIcon />}
              {c.text}
            </li>
          ))}
          {tips.map((t) => (
            <li key={t}>
              <InfoCircleIcon />
              {t}
            </li>
          ))}
        </ul>
        <label className="ws-choice" data-invalid={error ? true : undefined}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>
            <strong>This listing follows the community guidelines</strong>
            <small>
              No prohibited, counterfeit or stolen goods, and the photos are of the item itself. <Link href="/safety-tips">Read the guidelines</Link>
            </small>
          </span>
        </label>
        <p className="ws-form-field__hint">Publishing makes it visible to buyers while your shop's subscription is active. WorldStore checks the listing against your category's requirements when you publish.</p>
      </section>
    </div>
  );
}

/** The editor's state as the API row a buyer's card is drawn from. */
function toRow(ed: Editor, store: VendorDashboard["store"] | undefined, now: number): Row {
  const at = new Date(now).toISOString();
  return {
    id: ed.listing?.id ?? "draft",
    slug: ed.listing?.slug ?? "draft",
    name: ed.name.trim() || "Your title appears here",
    description: ed.description,
    shortDesc: null,
    categoryId: null,
    priceType: ed.priceType,
    basePrice: ed.basePrice === "" ? null : Number(ed.basePrice),
    maxPrice: ed.maxPrice === "" ? null : Number(ed.maxPrice),
    compareAtPrice: ed.priceType === "FIXED" && ed.onDeal && ed.compareAtPrice ? Number(ed.compareAtPrice) : null,
    isNegotiable: ed.isNegotiable,
    condition: ed.condition || null,
    brand: null,
    material: null,
    tags: [],
    images: ed.images,
    attributes: ed.attributes,
    customFields: ed.customFields,
    variants: ed.variants,
    status: "PUBLISHED",
    publishedAt: at,
    country: ed.country,
    state: ed.state || null,
    city: ed.city || null,
    viewCount: 0,
    inquiryCount: 0,
    updatedAt: at,
    store: {
      id: store?.id ?? "me",
      name: store?.name ?? "Your shop",
      slug: store?.slug ?? "your-shop",
      description: null,
      logo: store?.logo ?? null,
      banner: null,
      phone: null,
      whatsapp: null,
      website: null,
      country: store?.country ?? ed.country,
      state: store?.state ?? ed.state,
      city: store?.city ?? null,
      address: null,
      status: store?.status ?? "ACTIVE",
      verificationTier: store?.verificationTier ?? "NONE",
      avgRating: 0,
      reviewCount: 0,
      listingCount: 0,
      responseRate: null,
      avgResponseMins: null,
      createdAt: at,
    },
  };
}
