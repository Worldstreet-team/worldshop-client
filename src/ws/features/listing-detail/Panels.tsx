import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowReturnIcon,
  BuildingColumnIcon,
  CheckShieldIcon,
  CreditCardIcon,
  DeliveryTruckIcon,
  DialIcon,
  InfoCircleIcon,
  LocationIcon,
  ShieldExclamationIcon,
  UserCheckIcon,
  WalletIcon,
} from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { SHIP_TO_ID, ShipToSelector } from "@ws/features/location/LocationBar";
import type { Anchor } from "@ws/lib/areas";
import { CONDITION_LABELS } from "@ws/lib/condition";
import { CONDITION_DEFINITIONS, DELIVERY_METHOD_LABELS, PAYMENT_METHODS, returnsCopy, safetyTips } from "@ws/lib/copy/listing";
import { ESCROW, escrowLine } from "@ws/lib/copy/escrow";
import type { Condition, DeliveryOption, ListingWithSeller } from "@ws/lib/data/types";
import { arrivalRange, formatDateRange } from "@ws/lib/delivery";
import { formatCurrency } from "@ws/lib/money";

/*
 * The listing page's panels below the buy box (spec §7, flows B3 steps 3–5 and 9).
 * Server-rendered: delivery, returns and payments are `<details>` sections (an
 * accordion with no script; delivery starts open because it's what buyers check
 * first), then "Shop with confidence", "About this item" and safety tips.
 */

const PAYMENT_ICONS = { card: CreditCardIcon, transfer: BuildingColumnIcon, ussd: DialIcon, wallet: WalletIcon } as const;

function Panel({ title, summary, icon, open, children }: { title: string; summary?: string; icon: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="ws-panel" open={open}>
      <summary className="ws-panel__head">
        {icon}
        <span className="ws-panel__title">{title}</span>
        <span className="ws-panel__summary">{summary}</span>
        <ArrowDownIcon className="ws-panel__chev" />
      </summary>
      <div className="ws-panel__body">{children}</div>
    </details>
  );
}

const reaches = (o: DeliveryOption, sameCity: boolean) => o.coverage === "nationwide" || sameCity;

/* DeliveryPanel: every method, what it costs and when it arrives in the buyer's area
   ("Thu 8 – Mon 12 Oct to Lekki"), the handling promise, where the item is, and the
   same Total line as the buy box (R-020). Change opens the ShipToSelector. */
type DeliveryProps = {
  listing: ListingWithSeller;
  anchor: Anchor;
  total?: string;
  now: number;
  returnTo: string;
  /** The location Server Action (features/location/actions.ts); injectable for stories. */
  action: (formData: FormData) => void | Promise<void>;
};

export function DeliveryPanel({ listing, anchor, total, now, returnTo, action }: DeliveryProps) {
  const sameCity = anchor.city === listing.location.city;
  const options = [...listing.delivery].sort((a, b) => Number(reaches(b, sameCity)) - Number(reaches(a, sameCity)) || a.fee_minor - b.fee_minor);
  const door = options.filter((o) => reaches(o, sameCity) && o.method !== "meet_up");
  const arranged = options.length === 0;
  const summary = arranged ? "Arranged with the seller" : door.length === 0 ? "Pickup only" : `Arrives ${formatDateRange(arrivalRange(door[0], now))}`;

  return (
    <Panel title="Delivery" summary={summary} icon={<DeliveryTruckIcon />} open>
      <p className="ws-panel__to">
        <LocationIcon />
        <span>
          To <strong>{anchor.label}</strong>
        </span>
        <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} popoverTarget={SHIP_TO_ID} aria-haspopup="dialog">
          Change<span className="cx-sr-only"> delivery location</span>
        </button>
      </p>
      {arranged && (
        <p className="ws-panel__note">
          This seller hasn&apos;t listed delivery options. Agree delivery, or a meet-up somewhere public, when you message them.
        </p>
      )}
      <ul className="ws-methods">
        {options.map((o) => {
          const ok = reaches(o, sameCity);
          const when =
            o.method === "meet_up"
              ? "Agree a time and a public place with the seller"
              : `${o.method === "pickup_station" ? "Ready to collect" : "Arrives"} ${formatDateRange(arrivalRange(o, now))}`;
          return (
            <li key={o.method} className="ws-method" data-unavailable={ok ? undefined : true}>
              <span className="ws-method__name">{DELIVERY_METHOD_LABELS[o.method]}</span>
              <span className="ws-method__fee cx-num">{!ok ? "Not available" : o.fee_minor === 0 ? "Free" : formatCurrency(o.fee_minor)}</span>
              <span className="ws-method__when">{ok ? when : `Only within ${listing.location.city}`}</span>
            </li>
          );
        })}
      </ul>
      <p className="ws-panel__note">
        {!arranged && <>Sent within {rules.orders.handlingDays} business days of payment. </>}Item is in {listing.location.area}, {listing.location.city}.
      </p>
      {total && <p className="ws-panel__total cx-num">{total}</p>}
      <ShipToSelector anchor={anchor} returnTo={returnTo} action={action} />
    </Panel>
  );
}

export function ReturnsPanel({ listing }: { listing: ListingWithSeller }) {
  if (listing.category.kind !== "goods") return null;
  const copy = returnsCopy(listing.return_days);
  return (
    <Panel title="Returns" summary={copy.title} icon={<ArrowReturnIcon />}>
      <ul className="ws-panel__list">
        {copy.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Panel>
  );
}

export function PaymentsPanel({ listing }: { listing: ListingWithSeller }) {
  if (listing.category.kind !== "goods") return null;
  return (
    <Panel title="Payments" summary={PAYMENT_METHODS.map((m) => m.label).join(", ")} icon={<CreditCardIcon />}>
      <ul className="ws-payments">
        {PAYMENT_METHODS.map((m) => {
          const Icon = PAYMENT_ICONS[m.id];
          return (
            <li key={m.id}>
              <Icon />
              <span>
                <strong>{m.label}</strong> <span className="ws-payments__detail">{m.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ProtectionPanel (eBay "Shop with confidence"): what escrow does in one sentence, what
   still covers the buyer afterwards (L7), Verified ID, and Report. */
export function ProtectionPanel({ listing, report }: { listing: ListingWithSeller; report: ReactNode }) {
  const goods = listing.category.kind === "goods";
  return (
    <section className="ws-protect" aria-labelledby="protect-title">
      <h2 id="protect-title" className="ws-section-title">
        {ESCROW.protectionTitle}
      </h2>
      <ul className="ws-protect__list">
        <li>
          <CheckShieldIcon />
          <span>
            {escrowLine(listing.category)}
            {goods && <> {ESCROW.afterRelease}</>}
          </span>
        </li>
        {listing.seller.verified && (
          <li>
            <UserCheckIcon />
            <span>{listing.seller.shop_name} has verified their ID with WorldStore.</span>
          </li>
        )}
        <li>
          <InfoCircleIcon />
          <span>{ESCROW.offPlatform}</span>
        </li>
      </ul>
      <div className="ws-protect__links">
        <Link href={ESCROW.learnMoreHref}>How escrow works</Link>
        {report}
      </div>
    </section>
  );
}

/* ConditionInfo: the definition, and every grade for comparison, in a native popover
   (light dismiss and Escape built in; works before scripts load). */
export function ConditionInfo({ condition, id }: { condition: Condition; id: string }) {
  return (
    <>
      <button type="button" className="ws-cond-info" popoverTarget={id} aria-haspopup="dialog">
        <InfoCircleIcon />
        <span className="cx-sr-only">What {CONDITION_LABELS[condition]} means</span>
      </button>
      <div id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="ws-cond-pop">
        <h2 id={`${id}-title`} className="ws-cond-pop__title">
          Condition: {CONDITION_LABELS[condition]}
        </h2>
        <p>{CONDITION_DEFINITIONS[condition]}</p>
        <dl className="ws-cond-pop__grades">
          {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => (
            <div key={c} data-current={c === condition || undefined}>
              <dt>{CONDITION_LABELS[c]}</dt>
              <dd>{CONDITION_DEFINITIONS[c]}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} popoverTarget={id} popoverTargetAction="hide">
          Close
        </button>
      </div>
    </>
  );
}

/* ItemSpecifics: two-column key/value; past 8 rows the rest fold under "Show all". */
export function ItemSpecifics({ listing }: { listing: ListingWithSeller }) {
  const rows: { key: string; value: ReactNode }[] = [];
  if (listing.category.kind !== "property" && listing.condition) {
    const condition = listing.condition;
    rows.push({
      key: "Condition",
      value: (
        <span className="ws-specs__cond">
          {CONDITION_LABELS[condition]}
          <ConditionInfo condition={condition} id="condition-info" />
        </span>
      ),
    });
  }
  rows.push(...listing.attributes.map((a) => ({ key: a.key, value: a.value })));
  rows.push({ key: "Category", value: <Link href={`/search?cat=${listing.category.id}`}>{listing.category.name}</Link> });

  const shown = rows.slice(0, rules.listing.specificsShown);
  const rest = rows.slice(rules.listing.specificsShown);
  const list = (rs: typeof rows) =>
    rs.map((r) => (
      <div key={r.key} className="ws-specs__row">
        <dt>{r.key}</dt>
        <dd>{r.value}</dd>
      </div>
    ));

  return (
    <section aria-labelledby="specs-title">
      <h3 id="specs-title" className="ws-subtitle">
        Item specifics
      </h3>
      <dl className="ws-specs">{list(shown)}</dl>
      {rest.length > 0 && (
        <details className="ws-specs__more">
          <summary>Show all {rows.length}</summary>
          <dl className="ws-specs">{list(rest)}</dl>
        </details>
      )}
    </section>
  );
}

export function SafetyTipsCard({ listing }: { listing: ListingWithSeller }) {
  return (
    <section className="ws-safety" id="safety" aria-labelledby="safety-title">
      <h2 id="safety-title" className="ws-section-title">
        <ShieldExclamationIcon />
        Stay safe
      </h2>
      <ol className="ws-safety__list">
        {safetyTips(listing.category.kind).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <Link href="/help/safety" className="ws-safety__more">
        More safety tips
      </Link>
    </section>
  );
}
