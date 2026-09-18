import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletService, type Wallet } from '@/features/wallet/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';
import { writeLocal } from '@/shared/utils/storage';

export function useWalletBalance(isAuthenticated: boolean) {
  const [balanceHidden, setBalanceHidden] = useState(
    () => localStorage.getItem('ws:balance-hidden') === '1',
  );

  const query = useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: () => walletService.get().then((res) => res.data),
    enabled: isAuthenticated,
    staleTime: 2 * MINUTE,
    select: (data: Wallet | null) =>
      typeof data?.availableMinor === 'number' ? data : null,
  });

  const toggleBalance = () => {
    setBalanceHidden((v) => {
      const next = !v;
      writeLocal('ws:balance-hidden', next ? '1' : '0');
      return next;
    });
  };

  return {
    balance: isAuthenticated ? (query.data ?? null) : null,
    balanceHidden,
    toggleBalance,
  };
}
