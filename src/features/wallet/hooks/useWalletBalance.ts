import { useEffect, useState } from 'react';
import { walletService, type Wallet } from '@/features/wallet/api';
import { writeLocal } from '@/shared/utils/storage';

export function useWalletBalance(isAuthenticated: boolean) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(
    () => localStorage.getItem('ws:balance-hidden') === '1',
  );

    useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    walletService.get()
                .then((res) => {
        if (!cancelled && typeof res.data?.availableMinor === 'number') setWallet(res.data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const balance = isAuthenticated ? wallet : null;

  const toggleBalance = () => {
    setBalanceHidden((v) => {
      const next = !v;
      writeLocal('ws:balance-hidden', next ? '1' : '0');
      return next;
    });
  };

  return { balance, balanceHidden, toggleBalance };
}
