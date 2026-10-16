import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ChatDotsIcon, CheckShieldIcon, CreditCardIcon, InfoCircleIcon, PackageIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { ESCROW } from "@ws/lib/copy/escrow";

/* Help centre placeholder (SCR-027), so links that point here today aren't dead ends
   (audit F5). Known topics show their title; anything else is a 404, not a fake page.
   The pages themselves (with /help/escrow's four steps, flows L11.1) come in Phase 6. */

const TOPICS: Record<string, string> = {
  "": "Help centre",
  escrow: "How escrow protects you",
  "buyer-protection": "Buyer protection",
  fees: "Selling fees",
  safety: "Staying safe when you meet",
  "prohibited-items": "Prohibited and restricted items",
  "top-rated-sellers": "Top rated sellers",
  about: "About WorldStore",
  privacy: "Privacy",
  terms: "Terms of use",
  cookies: "Cookies",
};

async function topic(params: PageProps<"/help/[[...slug]]">["params"]) {
  const slug = (await params).slug?.join("/") ?? "";
  return TOPICS[slug];
}

export async function generateMetadata({ params }: PageProps<"/help/[[...slug]]">): Promise<Metadata> {
  return { title: (await topic(params)) ?? "Help centre", robots: { index: false, follow: true } };
}

export default async function HelpPage({ params }: PageProps<"/help/[[...slug]]">) {
  const resolved = await params;
  const slug = resolved.slug?.join("/") ?? "";
  const title = TOPICS[slug];
  if (!title) notFound();
  if (slug === "escrow") return <EscrowHelp />;
  return (
    <div className="ws-coming">
      <EmptyState
        icon={<InfoCircleIcon />}
        title={title}
        headingLevel="h1"
        action={
          <Link href="/" className={buttonClass({ variant: "ghost", arrow: true })}>
            Back to shopping
            <ArrowRightIcon />
          </Link>
        }
      >
        This help page is being written.
        <span className="ws-coming__phase">Coming in Phase 6 of the build, with orders and escrow.</span>
      </EmptyState>
    </div>
  );
}

function EscrowHelp() {
  const steps = [
    { icon: CreditCardIcon, title: "Pay", body: "Review the seller's payment request, including item price, quantity and delivery, then pay through WorldStore." },
    { icon: CheckShieldIcon, title: "We hold it", body: ESCROW.orderHeld },
    { icon: PackageIcon, title: "Receive and check it", body: "Use the delivery PIN only when the item is in your hands. Your order shows the time left to inspect it and report a problem." },
    { icon: ChatDotsIcon, title: "We pay the seller", body: "Confirm everything is fine, or wait for the inspection window to end. Reporting a problem first freezes the affected payment." },
  ];
  return <article className="ws-help-escrow">
    <header><p className="ws-order-eyebrow">Buyer protection</p><h1>How escrow protects you</h1><p>{ESCROW.claim}</p></header>
    <ol>{steps.map(({ icon: Icon, title, body }, index) => <li key={title}><span>{index + 1}</span><Icon /><div><h2>{title}</h2><p>{body}</p></div></li>)}</ol>
    <section><h2>What if something goes wrong?</h2><p>Report the problem from your order before the inspection window ends. The affected payment stays frozen while the seller responds and the case is reviewed.</p><p>{ESCROW.offPlatform}</p></section>
    <section className="ws-help-escrow__windows"><h2>Protection windows</h2><div className="ws-help-table"><div><strong>During inspection</strong><span>Report damage, missing parts, a wrong item or something not as described.</span></div><div><strong>Within {rules.protection.anyIssueDays} days</strong><span>Report a hidden defect after release; recovery may come from the seller or buyer-protection process.</span></div><div><strong>Within {rules.protection.counterfeitSafetyDays} days</strong><span>Report counterfeit or safety problems with supporting evidence.</span></div></div><p>{ESCROW.payout}</p></section>
  </article>;
}
