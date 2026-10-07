import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Info,
  MessagesSquare, Package, Plus, Star, Wallet, type LucideIcon,
} from 'lucide-react';
import { listingService, storeService, type DashboardAlert, type Listing, type VendorDashboard } from '@/features/stores/api';
import { chatService } from '@/features/chat/api';
import { useVendorDashboard } from '@/features/stores/hooks/useVendorDashboard';
import {
  ListingStatus, VendorBadge, VendorPage, VendorPageHead, VendorSectionHead, VendorStat,
} from '@/features/stores/components/vendor/VendorPage';
import MallCallout from '@/features/malls/components/MallCallout';
import { firstImage, fmtNaira, timeAgo } from '@/features/listings/model';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';
import { billingInterval } from '@/features/stores/model';
import { useLocalMoney } from '@/shared/hooks/useLocalMoney';

/**
 * Vendor Overview, laid out as the sandbox's: greeting, four stat cards, the
 * listing table beside a column of things to act on.
 *
 * The sandbox's cards are about orders and payouts, which this marketplace
 * does not have. Each is swapped for the nearest thing it does: orders to
 * action become buyer inquiries, released revenue becomes the dollar wallet,
 * orders needing attention become conversations waiting on a reply, and the
 * payout card becomes the subscription that keeps the shop visible. Below
 * that sits what the old dashboard carried: how buyers see the shop, the mall
 * offer and the subscription detail.
 */

/** Exact USD, for amounts that must not move with today's rate (a past charge). */
const dollars = (minor: number) => `${(minor / 100).toFixed(2)}`;


// Assembled by hand: en-GB abbreviates September as "Sept".
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' });

const shortDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH.format(d)}`;
};

const formatDate = (iso: string | null) => (iso ? `${shortDate(iso)} ${new Date(iso).getFullYear()}` : '—');

const replyTime = (mins: number | null) => {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} hr`;
  return `${Math.round(mins / (60 * 24))} days`;
};

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const ALERT: Record<DashboardAlert['severity'], { cls: string; Icon: LucideIcon }> = {
  critical: { cls: '', Icon: AlertCircle },
  warning: { cls: 'ws-alert--warning', Icon: AlertTriangle },
  info: { cls: 'ws-alert--info', Icon: Info },
};

/** Plain-language store state: "DRAFT" means nothing to a vendor. */
function visibility(d: VendorDashboard): { text: string; good: boolean } {
  if (d.store.publiclyVisible) return { text: 'Visible to buyers', good: true };
  if (d.store.status === 'SUSPENDED' || d.store.status === 'BANNED') return { text: 'Hidden by WorldStore', good: false };
  if (d.subscription?.status === 'LAPSED') return { text: 'Hidden, subscription lapsed', good: false };
  return { text: 'Not visible yet', good: false };
}

function priceOf(l: Listing) {
  if (l.priceType === 'ON_REQUEST') return 'On request';
  return l.basePrice != null ? fmtNaira(l.basePrice) : '—';
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [charging, setCharging] = useState(false);
  const { data, isPending, isError, error, refetch } = useVendorDashboard();
  // Subscription amounts in the store's own currency, with the USD charged.
  const { money, short, converted } = useLocalMoney(data?.store.country);

  const top = useQuery({
    queryKey: ['vendor', 'listings', 'top'],
    queryFn: () => listingService.list({ status: 'PUBLISHED', limit: 50 }).then((r) => r.data),
    staleTime: MINUTE,
    select: (rows: Listing[]) => [...rows].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
  });

  const waiting = useQuery({
    queryKey: ['vendor', 'conversations', 'waiting'],
    queryFn: () => chatService.list({ side: 'selling', limit: 20 }).then((r) => r.data),
    staleTime: MINUTE,
    select: (rows) => rows.filter((c) => c.unread > 0).slice(0, 4),
  });

  /**
   * Activating charges the vendor's real wallet, so the amount is stated and
   * confirmed before the request goes out. A 402 is an expected outcome, not
   * an error: it means "top up", and it is worded that way.
   */
  const handleActivate = async () => {
    if (!data?.subscription) return;
    const wallet = data.wallet;
    // Credit is spent first, so the wallet is only charged the remainder.
    const price = money(wallet?.dueMinor ?? data.subscription.plan.amountMinor);

    if (wallet && !wallet.sufficient) {
      addToast({
        type: 'error',
        message: `Your wallet has ${money(wallet.availableMinor)} but ${price} is due. Top up ${money(wallet.dueMinor - wallet.availableMinor)} and try again.`,
      });
      return;
    }

    const balanceNote = wallet ? ` Your balance is ${money(wallet.availableMinor)}.` : '';
    const plan = data.subscription.plan;
    if (!window.confirm(`Charge ${price} from your WorldStreet dollar wallet to keep your store visible for one billing period (${plan.name}, ${money(plan.amountMinor)} ${billingInterval(plan)})?${balanceNote}`)) {
      return;
    }

    setCharging(true);
    try {
      const res = await storeService.chargeSubscription();
      addToast({
        type: 'success',
        message: res.data.alreadyPaid ? 'This period is already paid for.' : 'Your store is now visible to buyers.',
      });
      await client.invalidateQueries({ queryKey: queryKeys.vendorDashboard() });
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          toApiError(err, '').statusCode === 402
            ? 'Not enough balance in your dollar wallet. Top up and try again.'
            : errMessage(err, 'Could not complete the payment'),
      });
    } finally {
      setCharging(false);
    }
  };

  /**
   * Stopping auto-renewal is not a refund: the store stays visible to the end
   * of the paid period, and the confirm says so, since a vendor reading
   * "cancel" tends to expect their shop to vanish now.
   */
  const handleCancel = async () => {
    const end = data?.subscription?.currentPeriodEnd;
    const until = end ? ` until ${shortDate(end)}` : '';
    if (!window.confirm(`Stop auto-renewal? Your store stays visible${until}, then goes offline. You can turn it back on any time before then.`)) {
      return;
    }
    setCharging(true);
    try {
      await storeService.cancelSubscription();
      addToast({ type: 'info', message: 'Auto-renewal stopped', description: `Your store stays visible${until}.` });
      await client.invalidateQueries({ queryKey: queryKeys.vendorDashboard() });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not stop auto-renewal') });
    } finally {
      setCharging(false);
    }
  };

  /** Undoes a cancellation inside the paid period. Nothing is charged now. */
  const handleResume = async () => {
    setCharging(true);
    try {
      await storeService.resumeSubscription();
      addToast({ type: 'success', message: 'Auto-renewal is back on', description: 'Nothing is charged until your current period ends.' });
      await client.invalidateQueries({ queryKey: queryKeys.vendorDashboard() });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not turn auto-renewal back on') });
    } finally {
      setCharging(false);
    }
  };

  const create = (
    <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary" onClick={() => navigate('/vendor/products/new')}>
      <Plus size={16} aria-hidden />
      Create listing
    </button>
  );

  if (isPending) {
    return (
      <VendorPage wide>
        <VendorPageHead title="Overview" description="Loading your shop…" action={create} />
        <section className="ws-vxstats" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="ws-vxstat">
              <div className="ws-skeleton" style={{ height: 12, width: '60%' }} />
              <div className="ws-skeleton" style={{ height: 28, width: '40%', marginTop: 16 }} />
            </div>
          ))}
        </section>
      </VendorPage>
    );
  }

  if (isError || !data) {
    return (
      <VendorPage wide>
        <VendorPageHead title="Overview" action={create} />
        <div className="ws-cxempty">
          <div className="ws-cxempty__inner">
            <span className="ws-cxempty__icon"><AlertCircle size={20} aria-hidden /></span>
            <p className="ws-cxempty__title">Could not load your dashboard</p>
            <p className="ws-cxempty__body">{errMessage(error, 'Failed to load dashboard')}</p>
            <div className="ws-cxempty__action">
              <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => refetch()}>
                Try again
              </button>
            </div>
          </div>
        </div>
      </VendorPage>
    );
  }

  const seen = visibility(data);
  const sub = data.subscription;
  const wallet = data.wallet;
  // A cancelled subscription whose paid period is over needs paying too: it
  // was left out before, which left a cancelled vendor with no way back.
  const needsPayment =
    sub != null &&
    (['PENDING_PAYMENT', 'GRACE', 'LAPSED'].includes(sub.status) ||
      (sub.status === 'CANCELLED' && !data.store.publiclyVisible));
  const canResume = sub?.status === 'CANCELLED' && data.store.publiclyVisible;
  const dueMinor = wallet?.dueMinor ?? sub?.plan.amountMinor ?? 0;
  const reply = replyTime(data.engagement.avgResponseMins);
  const onSchedule = sub?.status === 'ACTIVE';

  return (
    <VendorPage wide>
      <VendorPageHead
        title={`${greeting()}, ${data.store.name}`}
        description={
          <>
            Here is what needs your attention across listings and buyer conversations.{' '}
            <span className={`ws-vxvis${seen.good ? ' is-good' : ''}`}>
              {seen.good ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />}
              {seen.text}
            </span>
          </>
        }
        action={create}
      />

      {/* Whatever needs doing, most urgent first. */}
      {data.alerts.length > 0 && (
        <div className="ws-vxalerts">
          {data.alerts.map((alert) => {
            const { cls, Icon } = ALERT[alert.severity];
            return (
              <div key={alert.type} className={`ws-alert ${cls}`.trim()}>
                <Icon size={16} aria-hidden />
                <span style={{ flex: 1 }}>{alert.message}</span>
                {needsPayment && ['ACTIVATE', 'PAYMENT_FAILED', 'EXPIRED'].includes(alert.type) && (
                  <button onClick={handleActivate} disabled={charging} className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary">
                    {charging ? 'Processing…' : `Pay ${short(dueMinor)}`}
                  </button>
                )}
                {canResume && alert.type === 'CANCELLED' && (
                  <button onClick={handleResume} disabled={charging} className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary">
                    {charging ? 'Processing…' : 'Turn auto-renew back on'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section aria-label="Shop summary" className="ws-vxstats">
        <VendorStat
          label="Active listings"
          value={data.listings.published.toLocaleString('en-NG')}
          detail={`${data.listings.draft} ${data.listings.draft === 1 ? 'draft' : 'drafts'} waiting`}
          icon={Package}
        />
        <VendorStat
          label="Inquiries this period"
          value={data.engagement.inquiriesThisPeriod.toLocaleString('en-NG')}
          detail={`Since ${formatDate(data.engagement.since)}`}
          icon={MessagesSquare}
        />
        <VendorStat
          label="Unread messages"
          value={data.inbox.unread.toLocaleString('en-NG')}
          detail={reply ? `Median reply time: ${reply}` : `${data.inbox.openThreads} open conversations`}
          icon={MessagesSquare}
        />
        <VendorStat
          label="Wallet balance"
          value={wallet ? short(wallet.availableMinor) : '—'}
          detail={wallet ? `${money(dueMinor)} due at renewal` : 'Wallet unavailable right now'}
          icon={Wallet}
        />
      </section>

      <div className="ws-vxover">
        <section className="ws-vxover__main">
          <VendorSectionHead
            title="Listing performance"
            description="Views and inquiries across your live listings."
            action={
              <Link to="/vendor/products" className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost">
                View listings
                <ArrowRight size={14} aria-hidden />
              </Link>
            }
          />
          <div className="ws-vxcard ws-vxcard--pad">
            <table className="ws-vxtable ws-vxtable--compact">
              <caption className="ws-sr-only">Top listings by views</caption>
              <thead>
                <tr>
                  <th scope="col">Listing</th>
                  <th scope="col" style={{ width: 96 }}>Status</th>
                  <th scope="col" className="is-num" style={{ width: 112 }}>Price</th>
                  <th scope="col" className="is-num" style={{ width: 80 }}>Views</th>
                  <th scope="col" className="is-num" style={{ width: 80 }}>Inquiries</th>
                </tr>
              </thead>
              <tbody>
                {top.isPending
                  ? Array.from({ length: 5 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={5}><div className="ws-skeleton" style={{ height: 32 }} /></td>
                      </tr>
                    ))
                  : (top.data ?? []).map((l) => {
                      const img = firstImage(l);
                      return (
                        <tr key={l.id}>
                          <th scope="row">
                            <Link to={`/vendor/products/${l.id}`} className="ws-vxtable__id">
                              {img ? <img src={img} alt="" className="ws-vxthumb ws-vxthumb--sm" /> : <span className="ws-vxthumb ws-vxthumb--sm" />}
                              <span className="ws-vxtable__name">{l.name}</span>
                            </Link>
                          </th>
                          <td><ListingStatus status={l.status} /></td>
                          <td className="is-num ws-vxtable__price">{priceOf(l)}</td>
                          <td className="is-num">{l.viewCount.toLocaleString('en-NG')}</td>
                          <td className="is-num">{l.inquiryCount.toLocaleString('en-NG')}</td>
                        </tr>
                      );
                    })}
                {!top.isPending && (top.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="ws-vxtable__none">
                      Nothing is live yet. Publish a listing and its numbers show up here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="ws-vxnote">Updated {top.dataUpdatedAt ? timeAgo(new Date(top.dataUpdatedAt).toISOString()) : 'just now'}</p>
          </div>
        </section>

        <section className="ws-vxover__side">
          <VendorSectionHead title="Conversations needing a reply" description="Buyers waiting on you, newest first." />
          <div className="ws-vxcard ws-vxlist">
            {(waiting.data ?? []).length === 0 ? (
              <p className="ws-vxlist__none">
                {waiting.isPending ? 'Checking your inbox…' : 'Nobody is waiting on you. Every conversation has an answer.'}
              </p>
            ) : (
              waiting.data!.map((c) => {
                const img = c.listing ? firstImage(c.listing) : null;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="ws-vxlist__row"
                    onClick={() => navigate(`/vendor/messages?conversation=${c.id}`)}
                  >
                    {img ? <img src={img} alt="" className="ws-vxthumb ws-vxthumb--lg" /> : <span className="ws-vxthumb ws-vxthumb--lg" />}
                    <span className="ws-vxlist__text">
                      <span className="ws-vxlist__title">{c.listing?.name ?? 'Listing removed'}</span>
                      <span className="ws-vxlist__meta">
                        {c.buyer?.name ?? 'A buyer'} · {timeAgo(c.lastMessageAt)}
                      </span>
                    </span>
                    <VendorBadge tone="pending" icon={Clock}>
                      {c.unread} new
                    </VendorBadge>
                  </button>
                );
              })
            )}
          </div>

          <VendorSectionHead title="Subscription" description="What keeps your shop visible to buyers." />
          <div className="ws-vxcard ws-vxcard--pad">
            {sub ? (
              <>
                <div className="ws-vxpayout">
                  <div>
                    <p className="ws-vxpayout__label">Next renewal</p>
                    <p className="ws-vxpayout__value ws-num">{short(sub.plan.amountMinor)}</p>
                  </div>
                  {onSchedule ? (
                    <VendorBadge tone="success" icon={CheckCircle2}>On schedule</VendorBadge>
                  ) : canResume ? (
                    <VendorBadge tone="pending" icon={AlertTriangle}>Ends {shortDate(sub.currentPeriodEnd)}</VendorBadge>
                  ) : (
                    <VendorBadge tone="pending" icon={AlertTriangle}>
                      {sub.status === 'LAPSED' ? 'Lapsed' : 'Payment due'}
                    </VendorBadge>
                  )}
                </div>
                <p className="ws-vxpayout__foot">
                  {sub.currentPeriodEnd
                    ? `${canResume ? 'Ends' : 'Renews'} ${shortDate(sub.currentPeriodEnd)}`
                    : 'Not active yet'}{' '}
                  · {sub.plan.name} plan, {money(sub.plan.amountMinor)} {billingInterval(sub.plan)} · Auto-renew {sub.autoRenew ? 'on' : 'off'}
                </p>
                {converted && (
                  <p className="ws-vxpayout__foot">
                    Charged in US dollars from your WorldStreet dollar wallet. Local amounts use today's rate.
                  </p>
                )}
                {/* The only place a vendor can stop or restart renewal. Kept
                    quiet: it is a deliberate act, not a call to action. */}
                {sub.status === 'ACTIVE' && sub.autoRenew && (
                  <button type="button" className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost" style={{ marginTop: 'var(--ws-space-3)' }} onClick={handleCancel} disabled={charging}>
                    Stop auto-renewal
                  </button>
                )}
                {canResume && (
                  <button type="button" className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--outline" style={{ marginTop: 'var(--ws-space-3)' }} onClick={handleResume} disabled={charging}>
                    Turn auto-renew back on
                  </button>
                )}
              </>
            ) : (
              <p className="ws-vxlist__none">No subscription yet. Your shop goes live once one is active.</p>
            )}
          </div>
        </section>
      </div>

      {/* What buyers see about this seller. */}
      <section className="ws-vxblock">
        <VendorSectionHead title="How buyers see you" description="The trust signals on your shop and listing pages." />
        <div className="ws-vxstats">
          <VendorStat
            label="Response rate"
            value={data.engagement.responseRate != null ? `${Math.round(data.engagement.responseRate * 100)}%` : '—'}
            icon={MessagesSquare}
          />
          <VendorStat label="Average reply time" value={reply ?? '—'} icon={Clock} />
          <VendorStat
            label="Rating"
            value={data.reputation.reviewCount > 0 ? data.reputation.avgRating.toFixed(1) : '—'}
            detail={`${data.reputation.reviewCount} ${data.reputation.reviewCount === 1 ? 'review' : 'reviews'}`}
            icon={Star}
          />
          <VendorStat label="Listing views" value={data.engagement.views.toLocaleString('en-NG')} icon={Eye} />
        </div>
      </section>

      {/* A vendor running more than one storefront is the mall product's
          whole audience, so the offer belongs here too. */}
      <section className="ws-vxblock">
        <MallCallout variant="card" />
      </section>

      {sub && (
        <section className="ws-vxblock">
          <VendorSectionHead
            title="Subscription detail"
            action={
              data.store.publiclyVisible ? (
                <Link to={`/stores/${data.store.slug}`} className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost">
                  View public shop
                  <ExternalLink size={14} aria-hidden />
                </Link>
              ) : undefined
            }
          />
          <div className="ws-vxcard">
            <dl className="ws-vxdl">
              <div><dt>Plan</dt><dd>{sub.plan.name}, {money(sub.plan.amountMinor)} {billingInterval(sub.plan)}</dd></div>
              <div><dt>Status</dt><dd>{sub.status.replace(/_/g, ' ').toLowerCase()}</dd></div>
              <div><dt>Current period</dt><dd>{formatDate(sub.currentPeriodStart)} to {formatDate(sub.currentPeriodEnd)}</dd></div>
              <div><dt>Auto-renew</dt><dd>{sub.autoRenew ? 'On' : 'Off'}</dd></div>
              {sub.creditMinor > 0 && (
                <div><dt>Store credit</dt><dd>{money(sub.creditMinor)}, used before your wallet is charged</dd></div>
              )}
              <div><dt>Wallet balance</dt><dd>{wallet ? money(wallet.availableMinor) : 'Unavailable right now'}</dd></div>
              {sub.lastCharge && (
                <div>
                  <dt>Last payment</dt>
                  <dd>
                    {sub.lastCharge.status === 'PAID'
                      ? `${dollars(sub.lastCharge.amountMinor)} on ${formatDate(sub.lastCharge.chargedAt)}`
                      : `Failed${sub.lastCharge.failureCode ? ` (${sub.lastCharge.failureCode.replace(/_/g, ' ').toLowerCase()})` : ''}`}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}
    </VendorPage>
  );
}
