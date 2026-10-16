"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowReturnIcon, ArrowRightIcon, CameraIcon, CheckCircleIcon, ImageIcon, InfoCircleIcon, TrashIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { ListingCard } from "@ws/features/listing-card/ListingCard";
import { CONDITION_LABELS } from "@ws/lib/condition";
import type { Category, CategoryId, Condition, DeliveryMethod } from "@ws/lib/data/types";
import { formatCurrency, kobo, toMinor } from "@ws/lib/money";
import { blocking, canPublish, DELIVERY_METHODS, feePreview, listingIssues, publish, SELLABLE, SPECIFICS, STEPS, toPreview, type Draft, type Guidance, type Issue, type Photo, type SellerAccount } from "./model";
import { processPhoto, rotatePhoto } from "./photos";
import { updateSeller, useHydrated, useSeller } from "./store";

type Props = { draftId: string; categories: readonly Category[]; guidance: Partial<Record<CategoryId, Guidance>> };
const naira = (minor: number | null) => minor === null ? "" : String(minor / 100);
const toKobo = (text: string) => { const digits = text.replace(/[^\d]/g, ""); return digits ? toMinor(Number(digits)) : null; };
const money = (minor: number) => formatCurrency(kobo(minor));

const CONDITION_HELP: Record<Condition, string> = {
  new: "Unused, unopened, in the original packaging.",
  like_new: "Used briefly, no visible wear, works perfectly.",
  refurbished: "Restored to working order by the maker or a repairer.",
  used: "Has been used; may show wear. Describe it below.",
  for_parts: "Doesn’t work fully. Say what’s wrong below.",
};

/** CreateListingWizard (flows S2): 7 steps, autosaved on blur and every 10 s (R-116, EC-011). */
export function ListingWizard(props: Props) {
  const account = useSeller();
  const hydrated = useHydrated();
  const draft = account.drafts.find((item) => item.id === props.draftId);
  const listing = account.listings.find((item) => item.id === props.draftId);
  if (!hydrated) return <p className="ws-sell-loading" role="status">Loading your draft…</p>;
  if (listing) return <Published account={account} id={listing.id} categories={props.categories} />;
  if (!draft) return <section className="ws-sell-empty"><h1>Draft not found</h1><p>It may have been deleted or saved on another device.</p><Link className={buttonClass({})} href="/sell/new">Start a new listing</Link></section>;
  return <Wizard key={draft.id} draft={draft} account={account} {...props} />;
}

function Wizard({ draft: saved, account, categories, guidance }: Props & { draft: Draft; account: SellerAccount }) {
  const router = useRouter();
  const [form, setForm] = useState(saved);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: "Draft saved on this device" });
  const dirty = useRef(false);
  const latest = useRef(form);
  const summary = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [now] = useState(() => Date.now());
  const issues = listingIssues(form, account, guidance, now);
  const blockers = blocking(issues);
  const stepIssues = (step: number) => issues.filter((issue) => issue.step === step);
  const shown = (step: number) => step < form.max_step || attempted.includes(step);
  const fieldError = (field: string) => shown(form.step) ? stepIssues(form.step).find((issue) => issue.field === field) : undefined;

  const save = (next = latest.current) => {
    if (!dirty.current) return;
    try {
      updateSeller((a) => ({ ...a, drafts: a.drafts.map((d) => d.id === next.id ? { ...next, updated_at: Date.now() } : d) }));
      dirty.current = false;
      setStatus({ text: `Saved ${new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: rules.time.zone })}` });
    } catch (cause) { setStatus({ text: cause instanceof Error ? cause.message : "Couldn’t save.", error: true }); }
  };
  // latest.current is the source of truth so save()/go() never see a stale draft between renders.
  const change = (patch: Patch) => { const next = { ...latest.current, ...(typeof patch === "function" ? patch(latest.current) : patch) }; latest.current = next; dirty.current = true; setForm(next); };
  useEffect(() => { const id = window.setInterval(() => save(), 10_000); return () => window.clearInterval(id); }, []);
  useEffect(() => { const flush = () => save(); window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush); }, []);

  const go = (step: number) => {
    const next = { ...latest.current, step, max_step: Math.max(latest.current.max_step, step) };
    latest.current = next; dirty.current = true; setForm(next); save(next);
    requestAnimationFrame(() => { heading.current?.focus(); window.scrollTo({ top: 0 }); });
  };
  const proceed = () => {
    if (blocking(stepIssues(form.step)).length) { setAttempted((old) => [...old, form.step]); requestAnimationFrame(() => summary.current?.focus()); return; }
    go(form.step + 1);
  };
  const submit = () => {
    setAttempted(STEPS.map((_, i) => i + 1));
    if (blockers.length) { requestAnimationFrame(() => summary.current?.focus()); return; }
    try {
      save(); updateSeller((a) => publish(a, form.id, guidance, Date.now()));
      router.replace(`/sell/${form.id}`);
    } catch (cause) { setStatus({ text: cause instanceof Error ? cause.message : "Couldn’t publish.", error: true }); }
  };

  const current = blocking(stepIssues(form.step));
  const category = categories.find((c) => c.id === form.category_id);
  return <div className="ws-flow" onBlur={() => save()}>
    <header className="ws-flow__head">
      <div><p className="ws-sell-eyebrow">Create a listing · Step {form.step} of {STEPS.length}</p><h1 ref={heading} tabIndex={-1}>{TITLES[form.step - 1]}</h1></div>
      <p className="ws-sell-saved" role="status" data-error={status.error || undefined}>{status.error && <WarningIcon />}{status.text}</p>
    </header>
    {form.admin_note && <div className="ws-sell-alert" role="note"><strong>WorldStore asked for changes</strong><p>{form.admin_note}</p><p>Fix them, then publish again. It goes back through review.</p></div>}
    <nav aria-label="Listing steps" className="ws-stepper"><ol>{STEPS.map((label, index) => {
      const step = index + 1;
      const bad = shown(step) && blocking(stepIssues(step)).length > 0;
      return <li key={label}><button type="button" aria-current={form.step === step ? "step" : undefined} data-done={step < form.max_step && !bad || undefined} data-error={bad || undefined} onClick={() => go(step)}>
        <span aria-hidden="true">{step}</span>{label}{bad && <span className="cx-sr-only"> (needs attention)</span>}
      </button></li>;
    })}</ol></nav>
    {shown(form.step) && current.length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="ws-sell-alert"><strong>{form.step === 7 ? "Fix these before publishing" : "Check this step"}</strong><ul>{(form.step === 7 ? blockers : current).map((issue) => <li key={issue.step + issue.field + issue.message}>{form.step === 7 && issue.step !== 7 ? <button type="button" className="ws-sell-link" onClick={() => go(issue.step)}>{STEPS[issue.step - 1]}: {issue.message}</button> : issue.message}</li>)}</ul></div>}

    <form className="ws-flow__body" onSubmit={(event) => { event.preventDefault(); if (form.step === 7) submit(); else proceed(); }} noValidate>
      {form.step === 1 && <PhotosStep form={form} change={change} error={fieldError("photos")} hint={stepIssues(1).find((i) => !i.block)} />}
      {form.step === 2 && <DetailsStep form={form} change={change} categories={categories} fieldError={fieldError} />}
      {form.step === 3 && <TitleStep form={form} change={change} fieldError={fieldError} warnings={stepIssues(3).filter((i) => !i.block)} />}
      {form.step === 4 && <PriceStep form={form} change={change} fieldError={fieldError} guide={form.category_id ? guidance[form.category_id] : undefined} warnings={stepIssues(4).filter((i) => !i.block)} />}
      {form.step === 5 && <DeliveryStep form={form} change={change} error={fieldError("delivery")} />}
      {form.step === 6 && <ReturnsStep form={form} change={change} />}
      {form.step === 7 && <ReviewStep form={form} account={account} category={category} issues={issues} now={now} />}
      <div className="ws-flow__actions">
        {form.step > 1 && <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => go(form.step - 1)}><ArrowLeftIcon />Back</button>}
        <Link className={buttonClass({ variant: "quiet" })} href="/vendor" onClick={() => save()}>Save and exit</Link>
        <button type="submit" className={buttonClass({ arrow: form.step < 7 })}>{form.step === 7 ? canPublish(account) ? "Publish listing" : "Publish" : "Continue"}</button>
      </div>
    </form>
  </div>;
}

const TITLES = ["Add photos", "Category and details", "Title and description", "Price and offers", "Delivery", "Returns", "Review and publish"];

type Patch = Partial<Draft> | ((draft: Draft) => Partial<Draft>);
type StepProps = { form: Draft; change: (patch: Patch) => void };
type ErrorFor = (field: string) => Issue | undefined;

function Field({ label, hint, error, children, count }: { label: string; hint?: ReactNode; error?: Issue; children: (ids: { id: string; describedBy?: string; invalid?: true }) => ReactNode; count?: string }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div className="ws-form-field" data-invalid={error ? true : undefined}>
    <div className="ws-form-field__label"><label htmlFor={id}>{label}</label>{count && <span aria-live="polite">{count}</span>}</div>
    {hint && <p id={`${id}-hint`} className="ws-form-field__hint">{hint}</p>}
    {children({ id, describedBy, invalid: error ? true : undefined })}
    {error && <p id={`${id}-error`} className="ws-form-field__error"><WarningIcon />{error.message}</p>}
  </div>;
}

function PhotosStep({ form, change, error, hint }: StepProps & { error?: Issue; hint?: Issue }) {
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const room = rules.seller.photosMax - form.photos.length;
  const add = async (files: File[]) => {
    const take = files.slice(0, room);
    const errors = files.length > room ? [`Only ${rules.seller.photosMax} photos fit; ${files.length - room} skipped.`] : [];
    setBusy(take.length);
    const added: Photo[] = [];
    for (const file of take) { try { added.push(await processPhoto(file)); } catch (cause) { errors.push(cause instanceof Error ? cause.message : `${file.name} failed.`); } setBusy((n) => n - 1); }
    setProblems(errors);
    if (added.length) change((d) => ({ photos: [...d.photos, ...added] }));
  };
  const move = (from: number, to: number) => { const photos = [...form.photos]; const [p] = photos.splice(from, 1); photos.splice(to, 0, p); change({ photos }); };
  return <div className="ws-sell-step">
    <p className="ws-sell-lede">Add the front, the back and any damage. The first photo is the cover. Up to {rules.seller.photosMax}; 4 or more get more offers.</p>
    <label className="ws-dropzone" data-over={over || undefined} data-invalid={error ? true : undefined} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void add([...e.dataTransfer.files]); }}>
      <CameraIcon /><strong>{form.photos.length ? "Add more photos" : "Add photos"}</strong><span>Take photos or choose from your device · JPEG, PNG or WebP · at least {rules.seller.photoMinPx}px</span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={room <= 0} onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} className="cx-sr-only" />
    </label>
    <p className="ws-form-field__hint" role="status">{busy ? `Processing ${busy} photo${busy > 1 ? "s" : ""}…` : `${form.photos.length} of ${rules.seller.photosMax} photos`}</p>
    {error && <p className="ws-form-field__error"><WarningIcon />{error.message}</p>}
    {problems.length > 0 && <ul className="ws-form-field__error ws-sell-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
    {form.photos.length > 0 && <ol className="ws-photo-grid">{form.photos.map((photo, index) => <li key={photo.url.slice(-40) + index}>
      
      <img src={photo.url} alt={`Photo ${index + 1}${index === 0 ? " (cover)" : ""}`} width={photo.width} height={photo.height} />
      {index === 0 && <span className="ws-photo-grid__cover">Cover</span>}
      <div className="ws-photo-grid__tools">
        <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}><ArrowLeftIcon /></button>
        <button type="button" disabled={index === form.photos.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move photo ${index + 1} later`}><ArrowRightIcon /></button>
        <button type="button" onClick={async () => { const turned = await rotatePhoto(photo); change((d) => ({ photos: d.photos.map((p) => p === photo ? turned : p) })); }} aria-label={`Rotate photo ${index + 1}`}><ArrowReturnIcon /></button>
        <button type="button" onClick={() => change({ photos: form.photos.filter((_, i) => i !== index) })} aria-label={`Remove photo ${index + 1}`}><TrashIcon /></button>
      </div>
    </li>)}</ol>}
    {hint && form.photos.length > 0 && <p className="ws-sell-tip"><ImageIcon />{hint.message}</p>}
  </div>;
}

function DetailsStep({ form, change, categories, fieldError }: StepProps & { categories: readonly Category[]; fieldError: ErrorFor }) {
  const [query, setQuery] = useState("");
  const sellable = categories.filter((c) => SELLABLE.includes(c.id) && c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const specs = form.category_id ? SPECIFICS[form.category_id] : [];
  const catError = fieldError("category");
  return <div className="ws-sell-step">
    <fieldset className="ws-fieldset" data-invalid={catError ? true : undefined}><legend>Category</legend>
      <input type="search" className="ws-input" placeholder="Find a category" aria-label="Find a category" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="ws-choice-grid">{sellable.map((c) => <label key={c.id} className="ws-choice"><input type="radio" name="category" checked={form.category_id === c.id} onChange={() => change({ category_id: c.id, specifics: {}, serial: "" })} />{c.name}</label>)}</div>
      {!sellable.length && <p className="ws-form-field__hint">No category matches “{query}”.</p>}
      <p className="ws-form-field__hint">Vehicles and property are listed with viewings and open later.</p>
      {catError && <p className="ws-form-field__error"><WarningIcon />{catError.message}</p>}
    </fieldset>
    {specs.length > 0 && <fieldset className="ws-fieldset"><legend>Item specifics</legend><div className="ws-form-grid">{specs.map((spec) => <Field key={spec.key} label={`${spec.key}${spec.required ? "" : " (optional)"}`} error={fieldError(`spec:${spec.key}`)}>{({ id, describedBy, invalid }) => <>
      <input id={id} className="ws-input" list={spec.options ? `${id}-options` : undefined} value={form.specifics[spec.key] ?? ""} onChange={(e) => change({ specifics: { ...form.specifics, [spec.key]: e.target.value.slice(0, 80) } })} aria-describedby={describedBy} aria-invalid={invalid} required={spec.required} autoComplete="off" />
      {spec.options && <datalist id={`${id}-options`}>{spec.options.map((o) => <option key={o} value={o} />)}</datalist>}
    </>}</Field>)}</div></fieldset>}
    {(form.category_id === "phones" || form.category_id === "computing") && <Field label={form.category_id === "phones" ? "IMEI" : "Serial number"} hint={form.category_id === "phones" ? "Dial *#06# to see it. Buyers don’t see it; we check it against stolen-phone lists." : "On the label underneath or in Settings › About. Buyers don’t see it."} error={fieldError("serial")}>{({ id, describedBy, invalid }) =>
      <input id={id} className="ws-input" inputMode={form.category_id === "phones" ? "numeric" : "text"} value={form.serial} onChange={(e) => change({ serial: e.target.value.replace(/\s/g, "").slice(0, 20) })} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}</Field>}
    <fieldset className="ws-fieldset" data-invalid={fieldError("condition") ? true : undefined}><legend>Condition</legend><div className="ws-choice-list">{(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => <label key={c} className="ws-choice"><input type="radio" name="condition" checked={form.condition === c} onChange={() => change({ condition: c })} /><span><strong>{CONDITION_LABELS[c]}</strong><small>{CONDITION_HELP[c]}</small></span></label>)}</div>
      {fieldError("condition") && <p className="ws-form-field__error"><WarningIcon />{fieldError("condition")!.message}</p>}</fieldset>
    {(form.condition === "used" || form.condition === "for_parts") && <Field label="Wear, damage or faults" error={fieldError("flaws")}>{({ id, describedBy, invalid }) =>
      <textarea id={id} className="ws-input" rows={3} value={form.flaws} maxLength={1_000} onChange={(e) => change({ flaws: e.target.value })} aria-describedby={describedBy} aria-invalid={invalid} placeholder="e.g. Small scratch on the back, battery lasts a day" />}</Field>}
  </div>;
}

function TitleStep({ form, change, fieldError, warnings }: StepProps & { fieldError: ErrorFor; warnings: Issue[] }) {
  return <div className="ws-sell-step">
    <Field label="Title" hint="Brand + model + key feature, e.g. “iPhone 13 128GB Midnight, battery 88%”." error={fieldError("title")} count={`${form.title.length}/${rules.seller.titleMax}`}>{({ id, describedBy, invalid }) =>
      <input id={id} className="ws-input" value={form.title} maxLength={rules.seller.titleMax} onChange={(e) => change({ title: e.target.value })} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}</Field>
    {warnings.map((w) => <p key={w.message} className="ws-sell-tip"><WarningIcon />{w.message}</p>)}
    <Field label="Description" hint="Say what’s included, any flaws, and why you’re selling. Plain text; new lines become paragraphs." error={fieldError("description")} count={`${form.description.length.toLocaleString("en-NG")}/${rules.seller.descriptionMax.toLocaleString("en-NG")}`}>{({ id, describedBy, invalid }) =>
      <textarea id={id} className="ws-input" rows={8} value={form.description} maxLength={rules.seller.descriptionMax} onChange={(e) => change({ description: e.target.value })} aria-describedby={describedBy} aria-invalid={invalid} />}</Field>
  </div>;
}

function PriceStep({ form, change, fieldError, guide, warnings }: StepProps & { fieldError: ErrorFor; guide?: Guidance; warnings: Issue[] }) {
  const price = form.price_minor;
  const marker = guide && price ? Math.min(100, Math.max(0, (price - guide.low_minor) / Math.max(1, guide.high_minor - guide.low_minor) * 100)) : null;
  return <div className="ws-sell-step">
    <div className="ws-form-grid">
      <Field label="Price (₦)" error={fieldError("price")}>{({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={naira(price)} onChange={(e) => change({ price_minor: toKobo(e.target.value) })} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}</Field>
      <Field label="Quantity" error={fieldError("qty")}>{({ id, describedBy, invalid }) => <input id={id} className="ws-input" type="number" min={1} max={999} value={form.qty} onChange={(e) => change({ qty: Math.trunc(Number(e.target.value)) })} aria-describedby={describedBy} aria-invalid={invalid} />}</Field>
    </div>
    {guide ? <section className="ws-guide" aria-labelledby="guide-title"><h2 id="guide-title">Price guidance</h2><p>{guide.count} similar listings are priced {money(guide.low_minor)}–{money(guide.high_minor)} (middle {money(guide.median_minor)}).</p>
      <div className="ws-guide__bar" aria-hidden="true">{marker !== null && <span style={{ insetInlineStart: `${marker}%` }} />}</div>
      {warnings.filter((w) => w.field === "price").map((w) => <p key={w.message} className="ws-sell-tip"><WarningIcon />{w.message}</p>)}
    </section> : <p className="ws-form-field__hint">Choose a category to see what similar items are priced at.</p>}
    <p className="ws-form-field__hint">A crossed-out “was” price needs {rules.seller.wasPriceMinDays} days at the higher price, so new listings start without one.</p>
    <fieldset className="ws-fieldset"><legend>Offers</legend>
      <label className="ws-switch"><input type="checkbox" role="switch" checked={form.offers_enabled} onChange={(e) => change({ offers_enabled: e.target.checked })} /><span><strong>Accept offers</strong><small>Buyers can make an offer in chat. You accept, counter or decline.</small></span></label>
      {form.offers_enabled && <div className="ws-form-grid">
        <Field label="Auto-accept at or above (optional)" error={fieldError("auto_accept")}>{({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={naira(form.auto_accept_minor)} onChange={(e) => change({ auto_accept_minor: toKobo(e.target.value) })} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}</Field>
        <Field label="Auto-decline below (optional)" error={fieldError("auto_decline")}>{({ id, describedBy, invalid }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={naira(form.auto_decline_minor)} onChange={(e) => change({ auto_decline_minor: toKobo(e.target.value) })} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="off" />}</Field>
      </div>}
    </fieldset>
  </div>;
}

function DeliveryStep({ form, change, error }: StepProps & { error?: Issue }) {
  const toggle = (method: DeliveryMethod, on: boolean) => change({ delivery: on ? [...form.delivery, { method, fee_minor: DELIVERY_METHODS[method].fee_minor, handling_days: 1 }] : form.delivery.filter((d) => d.method !== method) });
  const patch = (method: DeliveryMethod, next: Partial<Draft["delivery"][number]>) => change({ delivery: form.delivery.map((d) => d.method === method ? { ...d, ...next } : d) });
  return <div className="ws-sell-step">
    <fieldset className="ws-fieldset" data-invalid={error ? true : undefined}><legend>How can buyers get it?</legend>
      <div className="ws-choice-list">{(Object.keys(DELIVERY_METHODS) as DeliveryMethod[]).map((method) => {
        const choice = form.delivery.find((d) => d.method === method);
        const meta = DELIVERY_METHODS[method];
        return <div key={method} className="ws-ship-choice" data-on={choice ? true : undefined}>
          <label className="ws-choice"><input type="checkbox" checked={!!choice} onChange={(e) => toggle(method, e.target.checked)} /><span><strong>{meta.label}</strong><small>{meta.coverage === "same_city" ? "In your city" : "Nationwide"}{method === "meet_up" ? " · buyer confirms handover with a PIN" : ""}</small></span></label>
          {choice && method !== "meet_up" && <div className="ws-form-grid">
            <Field label={`${meta.label} fee (₦, 0 = free)`}>{({ id }) => <input id={id} className="ws-input ws-input--money" inputMode="numeric" value={naira(choice.fee_minor)} onChange={(e) => patch(method, { fee_minor: toKobo(e.target.value) ?? 0 })} autoComplete="off" />}</Field>
            <Field label="Ready to send">{({ id }) => <select id={id} className="ws-input" value={choice.handling_days} onChange={(e) => patch(method, { handling_days: Number(e.target.value) as 0 | 1 | 2 | 3 })}><option value={0}>Same day</option><option value={1}>Within 1 day</option><option value={2}>Within 2 days</option><option value={3}>Within 3 days</option></select>}</Field>
          </div>}
        </div>;
      })}</div>
      {error && <p className="ws-form-field__error"><WarningIcon />{error.message}</p>}
    </fieldset>
    <fieldset className="ws-fieldset"><legend>Package size</legend><div className="ws-choice-grid">{([["small", "Small", "Fits in a bag: phones, clothes"], ["medium", "Medium", "Shoebox to suitcase"], ["large", "Large", "Needs a van: furniture, big appliances"]] as const).map(([value, label, help]) =>
      <label key={value} className="ws-choice"><input type="radio" name="package" checked={form.package === value} onChange={() => change({ package: value })} /><span><strong>{label}</strong><small>{help}</small></span></label>)}</div></fieldset>
  </div>;
}

function ReturnsStep({ form, change }: StepProps) {
  return <div className="ws-sell-step">
    <fieldset className="ws-fieldset"><legend>Return policy</legend><div className="ws-choice-grid">{([[null, "No returns"], [3, "3 days"], [7, "7 days"], [14, "14 days"]] as const).map(([days, label]) =>
      <label key={label} className="ws-choice"><input type="radio" name="returns" checked={form.return_days === days} onChange={() => change({ return_days: days })} />{label}</label>)}</div></fieldset>
    {form.return_days !== null && <fieldset className="ws-fieldset"><legend>Who pays return delivery?</legend><div className="ws-choice-grid">{([["buyer", "Buyer"], ["seller", "Me (free returns)"]] as const).map(([value, label]) =>
      <label key={value} className="ws-choice"><input type="radio" name="payer" checked={form.return_payer === value} onChange={() => change({ return_payer: value })} />{label}</label>)}</div></fieldset>}
    <p className="ws-sell-tip"><CheckCircleIcon />Whatever you choose, buyers are protected if an item isn’t as described: they can report it during the inspection window and the payment stays in escrow.</p>
  </div>;
}

function ReviewStep({ form, account, category, issues, now }: { form: Draft; account: SellerAccount; category?: Category; issues: Issue[]; now: number }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const fee = form.price_minor ? feePreview(form.price_minor) : null;
  const delay = rules.escrow.payoutDelay.new;
  const warnings = issues.filter((i) => !i.block);
  return <div className="ws-sell-review">
    <section className="ws-sell-card" aria-labelledby="preview-title">
      <div className="ws-sell-card__head"><h2 id="preview-title">Preview</h2><div role="group" aria-label="Preview layout" className="ws-segment">{(["grid", "list"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "grid" ? "Card" : "List"}</button>)}</div></div>
      <div className="ws-preview" data-view={view} inert>{category ? <ListingCard listing={toPreview(form, account, category, now)} variant={view} now={now} /> : <p className="ws-form-field__hint">Choose a category to see the preview.</p>}</div>
      <p className="ws-form-field__hint">This is how buyers see your listing in search.</p>
    </section>
    <section className="ws-sell-card" aria-labelledby="fees-title"><h2 id="fees-title">Fees</h2>
      {fee ? <dl className="ws-fees">
        <div><dt>Listing fee</dt><dd>{money(0)}</dd></div>
        <div><dt>Final value fee ({rules.fees.finalValuePercent}%)</dt><dd>{money(fee.final_value_minor)}</dd></div>
        <div><dt>Payment fee ({rules.fees.paymentPercent}%)</dt><dd>{money(fee.payment_minor)}</dd></div>
        <div><dt>You receive if sold at {money(form.price_minor!)}</dt><dd>{money(fee.receive_minor)}</dd></div>
      </dl> : <p className="ws-form-field__hint">Set a price to see your fees.</p>}
      <p className="ws-form-field__hint">Fees are taken only when the buyer’s payment is released from escrow. As a new seller you’re paid {delay.delayHours} hours after release, with {delay.reservePercent}% held for {delay.reserveDays} days on your first {delay.firstOrders} orders.</p>
    </section>
    <section className="ws-sell-card" aria-labelledby="check-title"><h2 id="check-title">Checklist</h2>
      <ul className="ws-checklist">{blocking(issues).length === 0 && <li data-ok><CheckCircleIcon />Ready to publish</li>}
        {blocking(issues).map((i) => <li key={i.field + i.message} data-block><WarningIcon />{i.message}{i.field === "kyc" && <> <Link href="/sell/start">Finish seller setup</Link></>}</li>)}
        {warnings.map((i) => <li key={i.field + i.message}><InfoCircleIcon />{i.message}</li>)}</ul>
      <p className="ws-form-field__hint">Listings run for {rules.seller.durationDays} days and renew until sold. An automatic check runs when you publish; some items go to a short review first.</p>
    </section>
  </div>;
}

function Published({ account, id, categories }: { account: SellerAccount; id: string; categories: readonly Category[] }) {
  const listing = account.listings.find((l) => l.id === id)!;
  const category = categories.find((c) => c.id === listing.category_id);
  const live = listing.status === "live";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return <section className="ws-sell-done">
    <CheckCircleIcon />
    <h1 ref={heading} tabIndex={-1}>{live ? "Your listing is live" : "Your listing is in review"}</h1>
    <p>{live ? "Buyers can now find it, save it and make offers. We’ll notify you when someone does." : listing.review_reason}</p>
    {category && <div className="ws-preview" inert><ListingCard listing={toPreview(listing, account, category, listing.published_at)} variant="list" now={listing.published_at} /></div>}
    <div className="ws-flow__actions"><Link className={buttonClass({})} href="/sell/new">Create another</Link><Link className={buttonClass({ variant: "ghost" })} href="/vendor">Go to Seller Hub</Link></div>
    <p className="ws-sell-demo">Demo workspace · Listings you publish stay on this device until they sync to WorldStore’s servers, so buyers on other devices can’t see them yet.</p>
  </section>;
}
