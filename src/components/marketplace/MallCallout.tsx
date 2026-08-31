import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, Building2 } from 'lucide-react';
import { mallService } from '@/services/mallService';
import { toApiError } from '@/services/api';

/**
 * "Own a mall" CTA. The mall product was reachable only by typing
 * /mall/register, so nobody found it — this is the entry point, dropped on
 * the pages where the thought occurs: the mall directory and the vendor
 * dashboard.
 *
 * The price is read from the public plans endpoint rather than hardcoded, so
 * a pricing change in the database is reflected here with no code edit.
 * Owners get "Go to your mall" instead: the same slot, never a dead CTA.
 */

const formatUsd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

interface MallCalloutProps {
  /** `banner` is the wide strip used on the directory; `card` suits a sidebar. */
  variant?: 'banner' | 'card';
}

export default function MallCallout({ variant = 'banner' }: MallCalloutProps) {
  const { isSignedIn } = useAuth();
  const [priceMinor, setPriceMinor] = useState<number | null>(null);
  const [substoreLimit, setSubstoreLimit] = useState<number | null>(null);
  const [ownsMall, setOwnsMall] = useState(false);

  useEffect(() => {
    let cancelled = false;

    mallService
      .getPlans()
      .then((res) => {
        const plan = res.data?.[0];
        if (cancelled || !plan) return;
        setPriceMinor(plan.amountMinor);
        setSubstoreLimit(plan.substoreLimit ?? null);
      })
      .catch(() => {
        /* Price is a nice-to-have; the CTA still stands without it. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    mallService
      .getMyMall()
      .then(() => {
        if (!cancelled) setOwnsMall(true);
      })
      .catch((err: unknown) => {
        // 404 is the common case — no mall yet. Anything else leaves the CTA
        // in its default "create" state rather than guessing.
        if (!cancelled && toApiError(err, '').statusCode !== 404) setOwnsMall(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const price = priceMinor === null ? null : `${formatUsd(priceMinor)}/month`;
  // Gated on isSignedIn too, so signing out flips the CTA back to "create"
  // without the effect having to reset the flag.
  const showOwnerCta = isSignedIn && ownsMall;

  return (
    <div className={`ws-mallcta ${variant === 'card' ? 'ws-mallcta--card' : ''}`}>
      <div className="ws-mallcta__icon" aria-hidden>
        <Building2 size={22} />
      </div>

      <div className="ws-mallcta__body">
        <h2 className="ws-title ws-mallcta__title">
          {showOwnerCta ? 'Your mall' : 'Own a mall'}
        </h2>
        <p className="ws-caption ws-muted ws-mallcta__sub">
          {showOwnerCta
            ? 'Manage your substores, featured products and subscription.'
            : `Run several storefronts under one roof${
                substoreLimit ? `, up to ${substoreLimit} substores` : ''
              }, all covered by one subscription${price ? ` of ${price}` : ''}.`}
        </p>
      </div>

      <Link
        to={showOwnerCta ? '/mall' : '/mall/register'}
        className="ws-btn ws-btn--sm ws-btn--primary ws-mallcta__action"
      >
        {showOwnerCta ? 'Go to your mall' : 'Create your mall'}
        <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
