import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { categoryService } from "@/features/catalog/api";
import { publicMarketplace } from "@/features/stores/api";
import { NotFoundContent } from "@ws/app/not-found";
import { listingPath } from "@ws/lib/data";

/*
 * The URLs the app used before the WorldStore UI, sent to their new homes so links
 * people have shared keep working:
 *   /listings?search=&categoryId=  ->  /search?q=&cat=
 *   /listings/:slug                ->  /listing/:id-:slug
 *   /stores/:slug, /store/:slug    ->  /seller/:slug
 *   /categories/:slug              ->  /search?cat=<department>
 * The new UI files listings under departments, so a section's link lands on its
 * department.
 */

async function departmentSlug(idOrSlug: string): Promise<string | null> {
  const tree = await categoryService.getCategories();
  const byId = new Map(tree.map((c) => [c.id, c]));
  let c = tree.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
  while (c?.parentId && byId.get(c.parentId)) c = byId.get(c.parentId);
  return c?.slug ?? null;
}

export function BrowseRedirect() {
  const { search } = useLocation();
  const old = new URLSearchParams(search);
  const categoryId = old.get("categoryId");
  const { data, isPending } = useQuery({
    queryKey: ["ws-redirect", "dept", categoryId],
    queryFn: () => (categoryId ? departmentSlug(categoryId) : Promise.resolve(null)),
    enabled: Boolean(categoryId),
  });
  if (categoryId && isPending) return null;
  const next = new URLSearchParams();
  const q = old.get("search") ?? old.get("q");
  if (q) next.set("q", q);
  if (data) next.set("cat", data);
  const sort = old.get("sort");
  if (sort === "price_asc" || sort === "price_desc") next.set("sort", sort);
  if (old.get("deals")) next.set("sort", "discount");
  const qs = next.toString();
  return <Navigate to={qs ? `/search?${qs}` : "/search"} replace />;
}

export function ListingRedirect() {
  const { idOrSlug = "" } = useParams();
  const { data, isPending } = useQuery({
    queryKey: ["ws-redirect", "listing", idOrSlug],
    queryFn: async () => {
      const res = await publicMarketplace.getListing(idOrSlug).catch(() => null);
      return res?.data ? listingPath({ id: res.data.id, slug: res.data.slug }) : null;
    },
  });
  if (isPending) return null;
  return data ? <Navigate to={data} replace /> : <NotFoundContent />;
}

export function SellerRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={`/seller/${slug}`} replace />;
}

export function CategoryRedirect() {
  const { slug = "" } = useParams();
  const { data, isPending } = useQuery({ queryKey: ["ws-redirect", "dept", slug], queryFn: () => departmentSlug(slug) });
  if (isPending) return null;
  return <Navigate to={data ? `/search?cat=${data}` : "/search"} replace />;
}
