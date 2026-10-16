import { GridIcon, ListIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { cx } from "@ws/lib/cx";
import { setView } from "./view-action";
import type { ResultsView } from "./view";

/* ViewToggle (spec §6): grid or list, as two pressed/unpressed buttons in a form that
   posts to a Server Action (works without scripts) and comes back to the same page. */
export function ViewToggle({ view, returnTo, className }: { view: ResultsView; returnTo: string; className?: string }) {
  return (
    <form action={setView} className={cx("ws-view", className)} aria-label="View">
      <input type="hidden" name="return" value={returnTo} />
      <button type="submit" name="view" value="grid" aria-pressed={view === "grid"} aria-label="Grid view" className={buttonClass({ variant: "quiet", size: "sm", icon: true })}>
        <GridIcon />
      </button>
      <button type="submit" name="view" value="list" aria-pressed={view === "list"} aria-label="List view" className={buttonClass({ variant: "quiet", size: "sm", icon: true })}>
        <ListIcon />
      </button>
    </form>
  );
}
