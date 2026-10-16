import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";
import { COMING, type ComingId } from "./routes";

/* A placeholder destination: the page's name as its h1, what it will do, the phase
   that builds it, and a way back to shopping. */
export function ComingSoon({ id }: { id: ComingId }) {
  const { title, icon: Icon, phase, body } = COMING[id];
  return (
    <div className="ws-coming">
      <EmptyState
        icon={<Icon />}
        title={title}
        headingLevel="h1"
        action={
          <Link href="/" className={buttonClass({ variant: "ghost", arrow: true })}>
            Back to shopping
            <ArrowRightIcon />
          </Link>
        }
      >
        {body} <span className="ws-coming__phase">Coming in Phase {phase} of the build.</span>
      </EmptyState>
    </div>
  );
}

/** Placeholders aren't worth indexing. */
export function comingMetadata(id: ComingId): Metadata {
  return { title: COMING[id].title, robots: { index: false, follow: true } };
}
