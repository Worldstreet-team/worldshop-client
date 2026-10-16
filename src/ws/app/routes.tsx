import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Outlet, type RouteObject } from "react-router-dom";
import { asPage, type PageModule } from "@ws/compat/page";
import NotFound, { NotFoundContent } from "@ws/app/not-found";
import ListingLoading from "@ws/app/(shop)/listing/[slug]/loading";
import ListingNotFound from "@ws/app/(shop)/listing/[slug]/not-found";
import SellerLayout from "@ws/app/(seller)/layout";
import VendorLayout from "@ws/app/(seller)/vendor/layout";
import { SellerGate } from "@ws/features/sell/SellerGate";

/*
 * The WorldStore UI's pages as react-router routes. Each file under app/ is a Next
 * page module; asPage (compat/page.tsx) runs it in the browser. Paths follow the
 * reference: /search, /listing/:id-:slug, /seller/:handle.
 */

type Options = Parameters<typeof asPage>[1];

function page(load: () => Promise<PageModule>, options: Options): ReactNode {
  const Lazy = lazy(async () => ({ default: asPage(await load(), options) as ComponentType }));
  return (
    <Suspense fallback={options.loading ?? null}>
      <Lazy />
    </Suspense>
  );
}

export const wsShopRoutes: RouteObject[] = [
  { index: true, element: page(() => import("@ws/app/(shop)/page"), { id: "home", notFound: <NotFoundContent /> }) },
  { path: "search", element: page(() => import("@ws/app/(shop)/search/page"), { id: "search", notFound: <NotFoundContent /> }) },
  {
    path: "listing/:slug",
    element: page(() => import("@ws/app/(shop)/listing/[slug]/page"), { id: "listing", loading: <ListingLoading />, notFound: <ListingNotFound /> }),
  },
  { path: "seller/:handle", element: page(() => import("@ws/app/(shop)/seller/[handle]/page"), { id: "seller", notFound: <NotFoundContent /> }) },
  { path: "saved", element: page(() => import("@ws/app/(shop)/saved/page"), { id: "saved", notFound: <NotFoundContent /> }) },
  { path: "compare", element: page(() => import("@ws/app/(shop)/compare/page"), { id: "compare", notFound: <NotFoundContent /> }) },
  { path: "inbox", element: page(() => import("@ws/app/(shop)/inbox/page"), { id: "inbox", notFound: <NotFoundContent /> }) },
  { path: "inbox/:id", element: page(() => import("@ws/app/(shop)/inbox/[id]/page"), { id: "thread", notFound: <NotFoundContent /> }) },
  { path: "offers", element: page(() => import("@ws/app/(shop)/offers/page"), { id: "offers", notFound: <NotFoundContent /> }) },
  { path: "notifications", element: page(() => import("@ws/app/(shop)/notifications/page"), { id: "notifications", notFound: <NotFoundContent /> }) },
  {
    path: "help/*",
    element: page(() => import("@ws/app/(shop)/help/[[...slug]]/page"), {
      id: "help",
      // Next's [[...slug]] is an array of segments; react-router gives the splat as one string.
      params: (raw) => ({ slug: raw["*"] ? raw["*"].split("/").filter(Boolean) : undefined }),
      notFound: <NotFoundContent />,
    }),
  },
  { path: "help", element: page(() => import("@ws/app/(shop)/help/[[...slug]]/page"), { id: "help-home", params: () => ({ slug: undefined }), notFound: <NotFoundContent /> }) },
];

/** The (seller) group's layouts, as react-router layout routes. */
export function WsSellerLayout() {
  return (
    <SellerLayout>
      <SellerGate>
        <Outlet />
      </SellerGate>
    </SellerLayout>
  );
}

export function WsVendorLayout() {
  return (
    <VendorLayout>
      <Outlet />
    </VendorLayout>
  );
}

export const wsSellRoute: RouteObject = { path: "sell/:id", element: page(() => import("@ws/app/(seller)/sell/[id]/page"), { id: "sell", notFound: <NotFoundContent /> }) };

/** Seller Hub pages, inside WsVendorLayout. */
export const wsVendorRoutes: RouteObject[] = [
  { index: true, element: page(() => import("@ws/app/(seller)/vendor/page"), { id: "vendor", notFound: <NotFoundContent /> }) },
  { path: "listings", element: page(() => import("@ws/app/(seller)/vendor/listings/page"), { id: "vendor-listings", notFound: <NotFoundContent /> }) },
];

/** The reference's 404, for unmatched paths inside the WorldStore shell. */
export const wsNotFoundRoute: RouteObject = { path: "*", element: <NotFound /> };
