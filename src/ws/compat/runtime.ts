import type { QueryClient } from "@tanstack/react-query";

/*
 * Two ways from module code back into the React tree: navigating after a form action
 * (see next/navigation's redirect) and re-running page data after one
 * (router.refresh). RuntimeBridge registers both on mount.
 */

let navigateImpl: ((to: string) => void) | null = null;
let client: QueryClient | null = null;

export function registerRuntime(navigate: (to: string) => void, queryClient: QueryClient) {
  navigateImpl = navigate;
  client = queryClient;
}

/** Page data reads cookies too, so anything that changes one re-runs the pages. */
export function refreshPages() {
  void client?.invalidateQueries({ queryKey: ["ws-page"] });
}

export function navigateFromOutside(to: string) {
  refreshPages();
  if (navigateImpl) navigateImpl(to);
  else window.location.assign(to);
}
