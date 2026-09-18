import { createContext, useContext, useMemo } from 'react';
import {
  createListingApi,
  listingService,
  storeService,
  type ListingApi,
} from '@/features/stores/api';
import { mallService } from '@/features/malls/api';

/**
 * Lets the vendor product pages (Products, ProductEdit) manage either the
 * personal store's catalogue or a mall substore's, without knowing which.
 * The default — no provider — is the personal store, so the existing /vendor
 * routes work untouched; the mall routes wrap the same pages in a provider
 * pointing at the substore's endpoints and paths.
 */
export interface ListingApiContextValue {
  api: ListingApi;
  /** Where the product list/editor pages live, e.g. "/vendor/products". */
  productsBasePath: string;
  /** Where "activate your subscription" should send the user. */
  dashboardPath: string;
  /**
   * The console page these listings hang off, for a back link. Undefined for
   * the personal store, whose listings ARE a top-level sidebar destination —
   * a substore's are not, so without this the page is a dead end.
   */
  parent?: { to: string; label: string };
  /**
   * Whether publishing will actually make anything visible — the personal
   * store's own subscription, or (for a substore) the MALL's, since substores
   * have no billing of their own.
   */
  getVisibility: () => Promise<boolean>;
}

const defaultValue: ListingApiContextValue = {
  api: listingService,
  productsBasePath: '/vendor/products',
  dashboardPath: '/vendor',
  getVisibility: () => storeService.getMyStore().then((res) => res.data.isPubliclyVisible),
};

const ListingApiContext = createContext<ListingApiContextValue>(defaultValue);

export function useListingApi(): ListingApiContextValue {
  return useContext(ListingApiContext);
}

export function SubstoreListingApiProvider({
  substoreId,
  children,
}: {
  substoreId: string;
  children: React.ReactNode;
}) {
  const value = useMemo<ListingApiContextValue>(
    () => ({
      api: createListingApi(`/malls/me/substores/${substoreId}/listings`),
      productsBasePath: `/mall/stores/${substoreId}/products`,
      dashboardPath: '/mall',
      parent: { to: '/mall/stores', label: 'Stores' },
      getVisibility: () => mallService.getMyMall().then((res) => res.data.isPubliclyVisible),
    }),
    [substoreId],
  );
  return <ListingApiContext.Provider value={value}>{children}</ListingApiContext.Provider>;
}
