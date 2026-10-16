"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/features/chat/api";
import { firstImage, priceLabel } from "@/features/listings/model";
import { listingService, storeService, type Listing, type ListingStatus } from "@/features/stores/api";
import { useVendorDashboard } from "@/features/stores/hooks/useVendorDashboard";
import { toApiError } from "@/shared/lib/api";

/*
 * The Seller Hub over the store and listing APIs. The reference kept the shop, its
 * drafts and its listings in the browser (model.ts + store.ts); here a draft is a
 * listing with status DRAFT on the server, so it follows the seller across devices.
 */

export { useVendorDashboard };

const LISTINGS = ["vendor", "listings", "all"] as const;

/** Every listing the shop has, any status. Paged by 50; a shop past 1,000 would want server paging. */
export function useMyListings() {
  return useQuery({
    queryKey: LISTINGS,
    queryFn: async () => {
      const rows: Listing[] = [];
      for (let page = 1; page <= 20; page++) {
        const res = await listingService.list({ page, limit: 50 });
        rows.push(...res.data);
        if (page >= res.pagination.totalPages) break;
      }
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useWaiting() {
  return useQuery({
    queryKey: ["vendor", "conversations", "waiting"],
    queryFn: () => chatService.list({ side: "selling", limit: 20 }).then((r) => r.data),
    staleTime: 60_000,
    select: (rows) => rows.filter((c) => c.unread > 0).slice(0, 4),
  });
}

/** Every vendor query sits under "vendor" (the dashboard too), so one write refreshes the counts beside it. */
function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["vendor"] });
}

export function useListingActions() {
  const refresh = useRefresh();
  const publish = useMutation({ mutationFn: (id: string) => listingService.publish(id), onSettled: refresh });
  const hide = useMutation({ mutationFn: (id: string) => listingService.unpublish(id), onSettled: refresh });
  const remove = useMutation({ mutationFn: (id: string) => listingService.remove(id), onSettled: refresh });
  const price = useMutation({ mutationFn: ({ id, basePrice }: { id: string; basePrice: number }) => listingService.update(id, { basePrice }), onSettled: refresh });
  return { publish, hide, remove, price };
}

export function useSubscriptionActions() {
  const refresh = useRefresh();
  const charge = useMutation({ mutationFn: () => storeService.chargeSubscription(), onSettled: refresh });
  const cancel = useMutation({ mutationFn: () => storeService.cancelSubscription(), onSettled: refresh });
  const resume = useMutation({ mutationFn: () => storeService.resumeSubscription(), onSettled: refresh });
  return { charge, cancel, resume, busy: charge.isPending || cancel.isPending || resume.isPending };
}

export const errorText = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  return (e.errors && Object.values(e.errors)[0]) || e.message;
};

export const STATUS: Record<ListingStatus, { label: string; tone: string }> = {
  PUBLISHED: { label: "Live", tone: "live" },
  DRAFT: { label: "Draft", tone: "paused" },
  HIDDEN: { label: "Hidden", tone: "ended" },
  REMOVED: { label: "Removed", tone: "in_review" },
};

export const photoOf = (l: Pick<Listing, "images">) => firstImage(l) ?? "";
export const priceOf = (l: Pick<Listing, "priceType" | "basePrice" | "maxPrice">) => priceLabel(l);
