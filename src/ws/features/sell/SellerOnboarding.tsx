"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CameraIcon, CheckCircleIcon, CheckShieldIcon, StoreIcon, WalletIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { requireAuth, useSession } from "@ws/features/auth/session";
import { AREAS } from "@ws/lib/areas";
import type { Category, CategoryId } from "@ws/lib/data/types";
import { agree, BANKS, ID_TYPES, nameEnquiry, QUIZ, resolveKyc, saveProfile, savePayout, SELLABLE, submitKyc, type IdType, type SellerAccount } from "./model";
import { updateSeller, useHydrated, useSeller } from "./store";

const STEPS = ["Your shop", "Identity", "Payout account", "Seller agreement"] as const;

function firstOpen(a: SellerAccount) {
  if (!a.profile) return 1;
  if (a.kyc.status !== "approved") return 2;
  if (!a.payout) return 3;
  if (!a.agreed_at) return 4;
  return 5;
}
const done = (a: SellerAccount, step: number) => [!!a.profile, a.kyc.status === "approved", !!a.payout, !!a.agreed_at][step - 1];

/** SellerOnboarding + KycStepper (flows S1). Every step saves as it completes ("Save and continue later"). */
export function SellerOnboarding({ categories, taken }: { categories: readonly Category[]; taken: readonly string[] }) {
  const account = useSeller();
  const { signedIn } = useSession();
  const hydrated = useHydrated();
  const [step, setStep] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = step ?? (account.profile || account.kyc.status !== "not_started" ? firstOpen(account) : 0);
  useEffect(() => { if (step !== null) heading.current?.focus(); }, [step]);
  const go = (next: number) => { setStep(next); window.scrollTo({ top: 0 }); };
  const run = (command: (a: SellerAccount) => SellerAccount, next?: () => number) => { updateSeller(command); if (next) go(next()); };

  if (!hydrated) return <p className="ws-sell-loading" role="status">Loading…</p>;
  if (current === 0) return <Intro onStart={() => requireAuth("start selling", () => go(1))} />;
  if (!signedIn) return <section className="ws-sell-empty"><h1>Sign in to continue setting up</h1><p>Your progress is saved on this device.</p><button type="button" className={buttonClass({})} onClick={() => requireAuth("continue setting up your shop", () => go(firstOpen(account)))}>Sign in</button></section>;

  return <div className="ws-flow ws-onboard">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Start selling{current <= 4 ? ` · Step ${current} of 4` : ""}</p><h1 ref={heading} tabIndex={-1}>{current <= 4 ? STEPS[current - 1] : "You’re ready to sell"}</h1></div>
      {current <= 4 && <Link className={buttonClass({ variant: "quiet", size: "sm" })} href="/vendor">Save and continue later</Link>}</header>
    <nav aria-label="Setup steps" className="ws-stepper"><ol>{STEPS.map((label, index) => {
      const n = index + 1;
      const kyc = n === 2 && account.kyc.status !== "not_started" && account.kyc.status !== "approved";
      return <li key={label}><button type="button" aria-current={current === n ? "step" : undefined} data-done={done(account, n) || undefined} data-error={kyc && account.kyc.status !== "in_review" || undefined} disabled={n > firstOpen(account) && !done(account, n)} onClick={() => go(n)}>
        <span aria-hidden="true">{done(account, n) ? "✓" : n}</span>{label}{kyc && <small> · {account.kyc.status === "in_review" ? "in review" : "action needed"}</small>}
      </button></li>;
    })}</ol></nav>
    {current === 1 && <ProfileStep account={account} categories={categories} taken={taken} onSave={(profile) => run((a) => saveProfile(a, profile, taken), () => 2)} />}
    {current === 2 && <IdentityStep key={`${account.kyc.status}:${account.kyc.submissions.length}`} account={account} run={run} onNext={() => go(3)} />}
    {current === 3 && <PayoutStep account={account} run={run} onBack={() => go(2)} />}
    {current === 4 && <AgreementStep onAgree={(answers) => run((a) => agree(a, answers, Date.now()), () => 5)} />}
    {current === 5 && <section className="ws-sell-done"><CheckCircleIcon /><p>Your shop <strong>@{account.profile?.handle}</strong> is verified and can publish listings.</p>
      <div className="ws-flow__actions"><Link className={buttonClass({ arrow: true })} href="/sell/new">Create your first listing</Link><Link className={buttonClass({ variant: "ghost" })} href="/vendor">Go to Seller Hub</Link></div></section>}
    <p className="ws-sell-demo">Demo workspace · Identity and bank checks are simulated on this device. No ID or account details are sent anywhere.</p>
  </div>;
}

function Intro({ onStart }: { onStart: () => void }) {
  return <section className="ws-sell-intro">
    <p className="ws-sell-eyebrow">Sell on WorldStore</p>
    <h1>Turn what you don’t use into money</h1>
    <ul>
      <li><StoreIcon /><div><strong>Free to list</strong><p>No listing fee. You pay {rules.fees.finalValuePercent}% + {rules.fees.paymentPercent}% payment fee only when an item sells.</p></div></li>
      <li><CheckShieldIcon /><div><strong>Paid through escrow</strong><p>Buyers pay WorldStore first. We hold the money until they’ve received the item.</p></div></li>
      <li><WalletIcon /><div><strong>Withdraw to your bank</strong><p>Your earnings go to your WorldStore balance, then to your bank account.</p></div></li>
    </ul>
    <p className="ws-form-field__hint">Takes about 5 minutes: your shop, your ID, a payout account and 3 quick questions. You can start a listing before you’re verified. <Link href="/help/escrow">How escrow works</Link></p>
    <div className="ws-flow__actions"><button type="button" className={buttonClass({ arrow: true })} onClick={onStart}>Get started</button><Link className={buttonClass({ variant: "ghost" })} href="/sell/new">Create a draft listing first</Link></div>
  </section>;
}

function useError() {
  const [error, setError] = useState("");
  const attempt = (fn: () => void) => { setError(""); try { fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); } };
  const node = error ? <p role="alert" className="ws-sell-alert"><WarningIcon />{error}</p> : null;
  return { attempt, node, setError };
}

function ProfileStep({ account, categories, onSave }: { account: SellerAccount; categories: readonly Category[]; taken: readonly string[]; onSave: (p: NonNullable<SellerAccount["profile"]>) => void }) {
  const p = account.profile;
  const [shop, setShop] = useState(p?.shop_name ?? "");
  const [handle, setHandle] = useState(p?.handle ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [area, setArea] = useState(p?.area_id ?? "");
  const [cats, setCats] = useState<CategoryId[]>(p?.categories ?? []);
  const { attempt, node } = useError();
  return <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); attempt(() => onSave({ shop_name: shop, handle, bio, area_id: area, categories: cats })); }}>
    {node}
    <div className="ws-form-grid">
      <div className="ws-form-field"><label htmlFor="shop">Shop name</label><input id="shop" className="ws-input" value={shop} maxLength={80} onChange={(e) => { setShop(e.target.value); if (!p) setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20)); }} autoComplete="organization" /></div>
      <div className="ws-form-field"><label htmlFor="handle">Handle</label><p id="handle-hint" className="ws-form-field__hint">Your shop link: worldstore.ng/seller/{handle || "your_handle"}</p><input id="handle" className="ws-input" value={handle} maxLength={20} onChange={(e) => setHandle(e.target.value.toLowerCase())} aria-describedby="handle-hint" autoComplete="off" /></div>
    </div>
    <div className="ws-form-field"><label htmlFor="bio">About your shop (optional)</label><textarea id="bio" className="ws-input" rows={2} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
    <div className="ws-form-field"><label htmlFor="area">Where you sell from</label><p id="area-hint" className="ws-form-field__hint">Buyers see the area, never your address.</p><select id="area" className="ws-input" value={area} onChange={(e) => setArea(e.target.value)} aria-describedby="area-hint"><option value="">Choose your area</option>{[...new Set(AREAS.map((a) => a.city))].map((city) => <optgroup key={city} label={city}>{AREAS.filter((a) => a.city === city).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>)}</select></div>
    <fieldset className="ws-fieldset"><legend>What do you sell?</legend><div className="ws-choice-grid">{categories.filter((c) => SELLABLE.includes(c.id)).map((c) => <label key={c.id} className="ws-choice"><input type="checkbox" checked={cats.includes(c.id)} onChange={(e) => setCats(e.target.checked ? [...cats, c.id] : cats.filter((x) => x !== c.id))} />{c.name}</label>)}</div></fieldset>
    <div className="ws-flow__actions"><button type="submit" className={buttonClass({ arrow: true })}>Save and continue</button></div>
  </form>;
}

type Run = (command: (a: SellerAccount) => SellerAccount, next?: () => number) => void;

function IdentityStep({ account, run, onNext }: { account: SellerAccount; run: Run; onNext: () => void }) {
  const [type, setType] = useState<IdType>(account.kyc.id_type ?? "nin");
  const [number, setNumber] = useState("");
  const [name, setName] = useState(account.kyc.legal_name);
  const [selfie, setSelfie] = useState(false);
  const { attempt, node } = useError();
  const { status, reason } = account.kyc;
  if (status === "approved") return <div className="ws-flow__body"><p className="ws-sell-tip" data-tone="ok"><CheckCircleIcon />Identity verified: {account.kyc.legal_name} · {ID_TYPES[account.kyc.id_type!].label} ending {account.kyc.id_last4}</p><div className="ws-flow__actions"><button type="button" className={buttonClass({ arrow: true })} onClick={onNext}>Continue</button></div></div>;
  if (status === "in_review") return <div className="ws-flow__body">
    <section className="ws-sell-card" aria-live="polite"><h2>We’re checking your ID</h2><p>Automatic checks usually take under an hour; a manual check can take up to 24 hours. We’ll notify you. You can create draft listings meanwhile.</p></section>
    <section className="ws-sell-sim" aria-label="Demo controls"><p><strong>Demo:</strong> choose the identity provider’s result.</p><div className="ws-flow__actions">
      <button type="button" className={buttonClass({ size: "sm" })} onClick={() => run((a) => resolveKyc(a, "approved"))}>Approve</button>
      <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => run((a) => resolveKyc(a, "needs_more_info"))}>Needs more info</button>
      <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => run((a) => resolveKyc(a, "rejected"))}>Reject</button></div></section>
    <div className="ws-flow__actions"><Link className={buttonClass({ variant: "ghost" })} href="/sell/new">Start a draft listing</Link></div>
  </div>;
  return <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); attempt(() => run((a) => submitKyc(a, { id_type: type, id_number: number, legal_name: name, selfie }, Date.now()))); }}>
    {reason && <div role="alert" className="ws-sell-alert"><strong>{status === "rejected" ? "We couldn’t verify you" : "We need a little more"}</strong><p>{reason}</p></div>}
    {node}
    <p className="ws-sell-lede">We verify every seller so buyers can trust who they’re paying. Your ID number is checked once and only the last 4 characters are kept.</p>
    <div className="ws-form-grid">
      <div className="ws-form-field"><label htmlFor="idtype">ID type</label><select id="idtype" className="ws-input" value={type} onChange={(e) => setType(e.target.value as IdType)}>{(Object.keys(ID_TYPES) as IdType[]).map((t) => <option key={t} value={t}>{ID_TYPES[t].label}</option>)}</select></div>
      <div className="ws-form-field"><label htmlFor="idnum">ID number</label><p id="idnum-hint" className="ws-form-field__hint">{ID_TYPES[type].hint}</p><input id="idnum" className="ws-input" value={number} onChange={(e) => setNumber(e.target.value)} aria-describedby="idnum-hint" autoComplete="off" inputMode={type === "nin" ? "numeric" : "text"} /></div>
    </div>
    <div className="ws-form-field"><label htmlFor="legal">Full name, exactly as on your ID</label><p id="legal-hint" className="ws-form-field__hint">Your payout bank account must be in this name.</p><input id="legal" className="ws-input" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="legal-hint" autoComplete="name" /></div>
    <section className="ws-sell-card"><h2>Selfie check</h2><p>Look at the camera in good light, without glasses or a cap. It confirms the ID is yours.</p>
      {selfie ? <p className="ws-sell-tip" data-tone="ok"><CheckCircleIcon />Selfie captured</p> : <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setSelfie(true)}><CameraIcon />Take selfie (demo)</button>}</section>
    <p className="ws-form-field__hint">Up to 3 attempts in 24 hours.</p>
    <div className="ws-flow__actions"><button type="submit" className={buttonClass({ arrow: true })}>Submit for verification</button></div>
  </form>;
}

function PayoutStep({ account, run, onBack }: { account: SellerAccount; run: Run; onBack: () => void }) {
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [resolved, setResolved] = useState("");
  const { attempt, node, setError } = useError();
  if (account.kyc.status !== "approved") return <div className="ws-flow__body"><p className="ws-sell-tip"><WarningIcon />Add a bank account after your identity is verified, so we can check the account name matches.</p><div className="ws-flow__actions"><button type="button" className={buttonClass({ variant: "ghost" })} onClick={onBack}>Back to identity</button><button type="button" className={buttonClass({ variant: "quiet" })} onClick={() => run((a) => savePayout(a, { kind: "wallet" }, Date.now()), () => 4)}>Use WorldStore wallet only</button></div></div>;
  return <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); attempt(() => resolved ? run((a) => savePayout(a, { kind: "bank", bank, account_last4: number.slice(-4), account_name: resolved }, Date.now()), () => 4) : setResolved(nameEnquiry(number, account.kyc.legal_name))); }}>
    {node}
    <p className="ws-sell-lede">Where we send your earnings. The account must be in your name: <strong>{account.kyc.legal_name}</strong>.</p>
    <div className="ws-form-grid">
      <div className="ws-form-field"><label htmlFor="bank">Bank</label><select id="bank" className="ws-input" value={bank} onChange={(e) => { setBank(e.target.value); setResolved(""); }}><option value="">Choose your bank</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></div>
      <div className="ws-form-field"><label htmlFor="acct">Account number</label><input id="acct" className="ws-input" inputMode="numeric" maxLength={10} value={number} onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "")); setResolved(""); setError(""); }} autoComplete="off" /></div>
    </div>
    {resolved && <p className="ws-sell-tip" data-tone="ok" role="status"><CheckCircleIcon />Account name: <strong>{resolved}</strong></p>}
    <div className="ws-flow__actions"><button type="submit" className={buttonClass({ arrow: !!resolved })} disabled={!bank && !resolved}>{resolved ? "Use this account" : "Verify account"}</button>
      <button type="button" className={buttonClass({ variant: "quiet" })} onClick={() => run((a) => savePayout(a, { kind: "wallet" }, Date.now()), () => 4)}>Keep earnings in my WorldStore wallet</button></div>
  </form>;
}

function AgreementStep({ onAgree }: { onAgree: (answers: number[]) => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [accepted, setAccepted] = useState(false);
  const { attempt, node, setError } = useError();
  return <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); if (!accepted) return setError("Accept the seller agreement to continue."); attempt(() => onAgree(answers)); }}>
    {node}
    <p className="ws-sell-lede">Three quick questions about the rules that protect buyers and you.</p>
    {QUIZ.map((item, qi) => <fieldset key={item.q} className="ws-fieldset"><legend>{qi + 1}. {item.q}</legend><div className="ws-choice-list">{item.options.map((o, oi) =>
      <label key={o} className="ws-choice"><input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => { const next = [...answers]; next[qi] = oi; setAnswers(next); }} />{o}</label>)}</div></fieldset>)}
    <label className="ws-choice"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />I agree to the WorldStore seller agreement and prohibited items policy</label>
    <div className="ws-flow__actions"><button type="submit" className={buttonClass({ arrow: true })}>Finish setup</button></div>
  </form>;
}
