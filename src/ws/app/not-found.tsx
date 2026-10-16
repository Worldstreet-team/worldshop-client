import Link from "next/link";
import { ArrowRightIcon, MagnifyingGlassIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";

/* SCR-029 404 (R-007): say what happened and give a way on, never a dead end. */
export function NotFoundContent() {
  return (
      <div className="ws-coming">
        <EmptyState
          icon={<MagnifyingGlassIcon />}
          title="We can't find that page"
          headingLevel="h1"
          action={
            <Link href="/" className={buttonClass({ variant: "ghost", arrow: true })}>
              Back to shopping
              <ArrowRightIcon />
            </Link>
          }
        >
          The link may be old or mistyped. Start again from the home page, where search is at the top.
        </EmptyState>
      </div>
  );
}

/** The whole-page 404, for paths outside every layout's main. */
export default function NotFound() {
  return (
    <main id="main" className="cx-container ws-page" tabIndex={-1}>
      <NotFoundContent />
    </main>
  );
}
