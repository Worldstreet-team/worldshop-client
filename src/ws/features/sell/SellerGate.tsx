"use client";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { StoreIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { signIn, useSession } from "@ws/features/auth/session";
import { storeService } from "@/features/stores/api";
import { toApiError } from "@/shared/lib/api";

/*
 * VendorRoute's rules in the WorldStore UI. Owning a store is what makes someone a
 * seller, so the store is fetched rather than read from a profile flag: it can be
 * created mid-session. No store (404) goes to registration; any other failure is not
 * "no store" and offers a retry instead, or a real seller would be bounced off their
 * own hub by a network blip.
 */
export function SellerGate({ children }: { children: ReactNode }) {
  const { signedIn, loaded } = useSession();
  const store = useQuery({
    queryKey: ["vendor", "store"],
    queryFn: () => storeService.getMyStore().then((r) => r.data),
    enabled: signedIn,
    retry: (count, err) => toApiError(err, "").statusCode !== 404 && count < 2,
    staleTime: 60_000,
  });

  if (!loaded || (signedIn && store.isPending)) return <p className="ws-sell-loading" role="status">Loading your shop…</p>;
  if (!signedIn)
    return (
      <section className="ws-sell-empty">
        <StoreIcon />
        <h1>Seller Hub</h1>
        <p>Sign in to manage your shop, drafts and listings.</p>
        <button type="button" className={buttonClass({})} onClick={signIn}>
          Sign in
        </button>
      </section>
    );
  if (store.isError) {
    if (toApiError(store.error, "").statusCode === 404) return <Navigate to="/vendor/register" replace />;
    return (
      <section className="ws-sell-empty">
        <WarningIcon />
        <h1>We couldn't confirm your shop</h1>
        <p>Check your connection and try again. This isn't the same as not having a shop.</p>
        <button type="button" className={buttonClass({})} onClick={() => void store.refetch()}>
          Try again
        </button>
      </section>
    );
  }
  if (store.data?.status === "BANNED")
    return (
      <section className="ws-sell-empty">
        <WarningIcon />
        <h1>Your shop is banned</h1>
        <p>Contact support if you think this is a mistake.</p>
      </section>
    );
  return (
    <>
      {/* Suspended sellers keep read-only access; this is what tells them why nothing saves. */}
      {store.data?.status === "SUSPENDED" && (
        <p className="ws-sell-alert" role="status">
          <WarningIcon />
          Your shop is suspended and hidden from buyers. You can look around, but changes won't save. Contact support.
        </p>
      )}
      {children}
    </>
  );
}
