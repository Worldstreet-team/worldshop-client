import { useEffect, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Navigate, useLocation, useParams } from "react-router-dom";
import type { Metadata } from "next";
import { NotFoundSignal, RedirectSignal, withinPage } from "./next/navigation";

/*
 * Runs a WorldStore page written as a Next.js Server Component in the browser.
 *
 * Those pages are async functions: they await their data (repos, cookies) and return
 * JSX, and use no hooks. So the function itself is the query: it runs inside
 * react-query, keyed by the URL, and the JSX it resolves to is what renders. Their
 * notFound() and redirect() throw signals (see next/navigation), which become the 404
 * and a <Navigate> here, as they do in Next.
 *
 * A changed query string on the same page keeps the previous render on screen until
 * the new one is ready, so filtering or sorting does not flash a blank page.
 */

type Props = { params: Promise<Record<string, unknown>>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// Method syntax makes the parameter bivariant, so a page typed for its own route's
// params (PageProps<"/seller/[handle]">) still fits the general shape.
type PageFn<R> = { fn(props: Props): R }["fn"];

export type PageModule = {
  default: PageFn<ReactNode | Promise<ReactNode>>;
  generateMetadata?: PageFn<Metadata | Promise<Metadata>>;
  metadata?: Metadata;
};

type Outcome = { kind: "page"; node: ReactNode; title: string | null } | { kind: "missing" } | { kind: "redirect"; url: string };

const SITE = "WorldStore Marketplace";

function titleOf(meta: Metadata | undefined): string | null {
  const t = meta?.title;
  if (!t) return null;
  if (typeof t === "string") return `${t} · ${SITE}`;
  return t.absolute ?? (t.default ? t.default : null);
}

function searchObject(search: string): Record<string, string | string[]> {
  const sp = new URLSearchParams(search);
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

type Options = {
  /** Stable name for the query key; one per route. */
  id: string;
  /** Turns the router's params into the page's (e.g. a splat into Next's [[...slug]] array). */
  params?: (raw: Record<string, string | undefined>) => Record<string, unknown>;
  loading?: ReactNode;
  notFound?: ReactNode;
};

export function asPage(mod: PageModule, { id, params: mapParams, loading = null, notFound }: Options) {
  return function WsPage() {
    const location = useLocation();
    const raw = useParams();
    const routeParams = mapParams ? mapParams(raw) : raw;

    const query = useQuery<Outcome>({
      queryKey: ["ws-page", id, location.pathname, location.search, routeParams],
      queryFn: () =>
        withinPage(async () => {
          const props = {
            params: Promise.resolve(routeParams as Record<string, unknown>),
            searchParams: Promise.resolve(searchObject(location.search)),
          };
          try {
            const node = await mod.default(props);
            const meta = mod.generateMetadata ? await mod.generateMetadata(props) : mod.metadata;
            return { kind: "page", node, title: titleOf(meta) };
          } catch (err) {
            if (err instanceof NotFoundSignal) return { kind: "missing" };
            if (err instanceof RedirectSignal) return { kind: "redirect", url: err.url };
            throw err;
          }
        }),
      placeholderData: keepPreviousData,
      // JSX is not JSON: structural sharing would walk into functions and refs.
      structuralSharing: false,
      staleTime: 30_000,
    });

    const outcome = query.data;
    useEffect(() => {
      if (outcome?.kind === "page") document.title = outcome.title ?? SITE;
      if (outcome?.kind === "missing") document.title = `Not found · ${SITE}`;
    }, [outcome]);

    if (query.isError) throw query.error;
    if (!outcome) return <>{loading}</>;
    if (outcome.kind === "redirect") return <Navigate to={outcome.url} replace />;
    if (outcome.kind === "missing") return <>{notFound}</>;
    return <>{outcome.node}</>;
  };
}
