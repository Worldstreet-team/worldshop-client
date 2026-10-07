import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import type { ApiResponse } from '@/shared/types/common.types';
import { MINUTE } from '@/app/providers/QueryProvider';
import { currencyOf, formatMoney } from '@/shared/utils/currency';

type UsdRates = { base: 'USD'; rates: Record<string, number>; updatedAt: string };

const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

/**
 * Subscription money as a vendor reads it: their own currency first, then the
 * USD it is actually charged in, e.g. "₦15,400 ($9.99)". Charges stay in USD
 * from the dollar wallet; the local figure is today's rate, for reading only.
 *
 * Until the rates load, or for a store in a USD country, or if the rate
 * service is down, it is just "$9.99", so a price is never missing.
 */
export function useLocalMoney(country: string | null | undefined) {
  const currency = currencyOf(country);
  const local = currency !== 'USD';

  const { data } = useQuery({
    queryKey: ['fx', 'usd'],
    queryFn: () => api.get<ApiResponse<UsdRates>>('/fx/usd').then((r) => r.data),
    enabled: local,
    staleTime: 60 * MINUTE,
    retry: 1,
  });
  const rate = local ? data?.rates[currency] : undefined;

  /** "₦15,400 ($9.99)" — or "$9.99" when there is no local figure. */
  const money = useCallback(
    (minor: number) => (rate ? `${formatMoney((minor / 100) * rate, currency)} (${usd(minor)})` : usd(minor)),
    [rate, currency],
  );

  /** The local figure alone, or the USD one when there is none. For tight spots like a button. */
  const short = useCallback(
    (minor: number) => (rate ? formatMoney((minor / 100) * rate, currency) : usd(minor)),
    [rate, currency],
  );

  return {
    money,
    short,
    /** True once amounts are shown in a local currency; drives the "charged in USD" note. */
    converted: !!rate,
    currency,
  };
}
