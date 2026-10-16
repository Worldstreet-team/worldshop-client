/* The grid/list choice (spec §6 ViewToggle: "remembers choice"). A display preference,
   so it lives in a cookie rather than the URL (UI research C18), like the area. */
export type ResultsView = "grid" | "list";
export const VIEW_COOKIE = "ws-view";

export function parseView(value: string | undefined): ResultsView {
  return value === "list" ? "list" : "grid";
}
