import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom";
import { MotionProvider } from "@ws/components/motion/MotionProvider";
import { ScrollState } from "@ws/components/motion/ScrollState";
import { ToastViewport } from "@ws/components/ui";
import { registerRuntime } from "@ws/compat/runtime";
import { AlertsWatcher } from "@ws/features/alerts/AlertsWatcher";
import { ClerkSession } from "@ws/features/auth/ClerkSession";
import { SignInSheet } from "@ws/features/auth/SignInSheet";
import { CompareTray } from "@ws/features/compare/CompareTray";
import { categoryIcon } from "@ws/features/home/category-icons";
import { AppHeader } from "@ws/features/shell/AppHeader";
import { BottomNav } from "@ws/features/shell/BottomNav";
import { navCategories } from "@ws/features/shell/categories";
import { MegaMenu } from "@ws/features/shell/MegaMenu";
import { DrawerLink } from "@ws/features/shell/NavDrawer";
import { SiteFooter } from "@ws/features/shell/SiteFooter";
import { SkipLinks } from "@ws/features/shell/SkipLinks";
import { repos } from "@ws/lib/data";

/*
 * app/layout.tsx as a react-router layout. The reference awaited its header data on
 * the server; here the shell renders at once and the category menu and search scopes
 * fill in when the catalogue arrives. <html>/<body> attributes live in index.html.
 */

/** Lets module code (form actions, router.refresh) reach the router and the query cache. */
function RuntimeBridge() {
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(() => registerRuntime(navigate, client), [navigate, client]);
  return null;
}

export default function RootLayout() {
  const { data } = useQuery({
    queryKey: ["ws-shell"],
    queryFn: async () => {
      const [trending, categories, listings] = await Promise.all([repos.search.trending(), repos.categories.list(), repos.listings.list()]);
      return { trending, categories, nav: navCategories(categories, listings) };
    },
    staleTime: 5 * 60_000,
  });
  const nav = data?.nav ?? [];

  return (
    <MotionProvider>
      <RuntimeBridge />
      <ClerkSession />
      <ScrollRestoration />
      <SkipLinks />
      <AppHeader
        trending={data?.trending ?? []}
        scopes={(data?.categories ?? []).map(({ id, name }) => ({ id, name }))}
        categories={nav.length > 0 ? <MegaMenu categories={nav} /> : undefined}
        categoryLinks={
          <nav aria-label="Shop by category" className="ws-drawer__cats">
            <p className="ws-drawer__label">Shop by category</p>
            {nav.map((c) => {
              const Icon = categoryIcon(c.id);
              return (
                <DrawerLink key={c.id} href={`/search?cat=${c.id}`} icon={<Icon />}>
                  {c.name}
                </DrawerLink>
              );
            })}
          </nav>
        }
      />
      <Outlet />
      <SiteFooter />
      <CompareTray />
      <AlertsWatcher />
      <BottomNav />
      <ToastViewport />
      <SignInSheet />
      <ScrollState />
    </MotionProvider>
  );
}
