import Link from "next/link";
import { ArrowRightIcon, TagIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";

/* A listing that doesn't exist, or that moderation removed (flows B3 errors). The spec
   asks for a 410. Next can't set that from a page, and because this route streams (it
   has a loading skeleton) the status is 200 with robots "noindex", which search engines
   drop just the same. Either way the buyer gets a way on, not a dead end (R-007). */
export default function ListingNotFound() {
  return (
    <div className="ws-coming">
      <EmptyState
        icon={<TagIcon />}
        title="This listing isn't available"
        headingLevel="h1"
        action={
          <div className="ws-coming__actions">
            <Link href="/search" className={buttonClass({ variant: "ghost", arrow: true })}>
              Search for something similar
              <ArrowRightIcon />
            </Link>
            <Link href="/categories" className={buttonClass({ variant: "quiet" })}>
              Browse categories
            </Link>
          </div>
        }
      >
        It may have been removed, or the link is wrong. Removed listings can&apos;t be bought or viewed.
      </EmptyState>
    </div>
  );
}
