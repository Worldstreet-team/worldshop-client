import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useRouterParams } from "react-router-dom";
import { navigateFromOutside, refreshPages } from "../runtime";

/*
 * next/navigation on react-router.
 *
 * notFound() and redirect() keep Next's meaning. Inside a page's data function (see
 * compat/page.tsx) they throw, and the page wrapper renders the 404 or the redirect.
 * Called anywhere else, which in this app means a form action finishing its work,
 * redirect() navigates straight away, the way a Server Action's redirect lands.
 */

export class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

export class RedirectSignal extends Error {
  readonly url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
    this.url = url;
  }
}

let renderingPage = 0;

/** Marks the span in which a page's data function runs. */
export async function withinPage<T>(run: () => Promise<T>): Promise<T> {
  renderingPage += 1;
  try {
    return await run();
  } finally {
    renderingPage -= 1;
  }
}

export function notFound(): never {
  throw new NotFoundSignal();
}

export function redirect(url: string): never {
  if (renderingPage > 0) throw new RedirectSignal(url);
  navigateFromOutside(url);
  // An action's redirect is its last statement; nothing after it runs in Next either.
  return undefined as never;
}

export const permanentRedirect = redirect;

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string>>(): T {
  return useRouterParams() as T;
}

type NavOptions = { scroll?: boolean };

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (href: string, opts?: NavOptions) => navigate(href, { preventScrollReset: opts?.scroll === false }),
      replace: (href: string, opts?: NavOptions) => navigate(href, { replace: true, preventScrollReset: opts?.scroll === false }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      // Next re-runs the server components; here those are the pages' data functions.
      refresh: () => refreshPages(),
      prefetch: () => undefined,
    }),
    [navigate],
  );
}
