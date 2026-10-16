import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { CategoryRail } from "@ws/features/shell/CategoryRail";
import { repos } from "@ws/lib/data";

/* app/(shop)/layout.tsx: the category rail under the header (it scrolls away with the
   page, audit F17), then the page. */
export default function ShopLayout() {
  const { data: categories = [] } = useQuery({
    queryKey: ["ws-shell", "rail"],
    queryFn: async () => (await repos.categories.list()).map(({ id, name }) => ({ id, name })),
    staleTime: 5 * 60_000,
  });
  return (
    <>
      <CategoryRail categories={categories} />
      <main id="main" className="cx-container ws-page" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

/**
 * A page that has not moved to the WorldStore UI yet, inside its shell. Its old styles
 * only apply under .ws-legacy (src/styles/main.scss), so the wrapper is what lets it
 * render as it did.
 */
export function LegacyPage() {
  return (
    <main id="main" className="cx-container ws-page" tabIndex={-1}>
      <div className="ws-legacy ws-legacy--embedded">
        <Outlet />
      </div>
    </main>
  );
}
