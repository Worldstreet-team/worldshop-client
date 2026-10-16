import Link from "next/link";
import { ArrowDownIcon } from "@ws/components/icons";
import { ESCROW } from "@ws/lib/copy/escrow";
import { Logo } from "./Logo";

/* SiteFooter + LegalBar (spec §3.3): four columns on desktop, an accordion on phones
   with one section open at a time (<details name>, no script needed). Every link goes
   to a real page or a placeholder that says when it arrives (F5). Links to the other
   WorldStore products wait until their addresses are confirmed. */

const COLUMNS = [
  {
    title: "Buy",
    links: [
      { label: "All categories", href: "/categories" },
      { label: "Deals", href: "/search?sort=discount" },
      { label: "Saved", href: "/saved" },
      { label: "How escrow works", href: ESCROW.learnMoreHref },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Start selling", href: "/vendor" },
      { label: "Create a listing", href: "/sell/new" },
      { label: "Seller Hub", href: "/vendor" },
      { label: "Selling fees", href: "/help/fees" },
    ],
  },
  {
    title: "Help & safety",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Buyer protection", href: "/help/buyer-protection" },
      { label: "Safety tips", href: "/help/safety" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About WorldStore", href: "/help/about" },
      { label: "Top rated sellers", href: "/help/top-rated-sellers" },
      { label: "Prohibited items", href: "/help/prohibited-items" },
    ],
  },
];

const LEGAL = [
  { label: "Privacy", href: "/help/privacy" },
  { label: "Terms", href: "/help/terms" },
  { label: "Cookies", href: "/help/cookies" },
];

export function SiteFooter() {
  return (
    <footer id="footer" className="ws-footer" tabIndex={-1}>
      <div className="cx-container">
        <div className="ws-footer__top">
          <div className="ws-footer__brand">
            <Logo />
            <p className="ws-footer__tagline">{ESCROW.tagline}</p>
          </div>
          <nav aria-label="Footer" className="ws-footer__cols">
            {COLUMNS.map((col) => (
              <details key={col.title} name="footer" className="ws-footer__col">
                <summary className="ws-footer__title">
                  {col.title}
                  <ArrowDownIcon className="ws-footer__chev" />
                </summary>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </nav>
        </div>
        <div className="ws-footer__legal">
          <p>© {new Date().getFullYear()} WorldStore. Prices in naira (₦).</p>
          <ul>
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
