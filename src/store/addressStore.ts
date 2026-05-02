import { create } from 'zustand';
import { addressService } from '@/services/addressService';
import type { Address } from '@/types/user.types';

const ADDRESS_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface AddressCacheState {
  addresses: Address[];
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AddressCacheActions {
  fetchAddresses: (force?: boolean) => Promise<Address[]>;
  invalidate: () => void;
}

const initialState: AddressCacheState = {
  addresses: [],
  lastFetched: null,
  isLoading: false,
  error: null,
};

export const useAddressStore = create<AddressCacheState & AddressCacheActions>()(
  (set, get) => ({
    ...initialState,

    fetchAddresses: async (force = false) => {
      const state = get();
      const isFresh = state.lastFetched && Date.now() - state.lastFetched < ADDRESS_TTL_MS;

      if (!force && isFresh && state.addresses.length > 0) return state.addresses;
      if (state.isLoading) return state.addresses;

      set({ isLoading: true, error: null });
      try {
        const res = await addressService.getAddresses();
        const addrs = res.data;
        set({ addresses: addrs, lastFetched: Date.now() });
        return addrs;
      } catch (err) {
        const message = (err as { message?: string })?.message || 'Failed to load addresses';
        set({ error: message });
        return state.addresses;
      } finally {
        set({ isLoading: false });
      }
    },

    invalidate: () => set({ lastFetched: null, addresses: [] }),
  }),
);
