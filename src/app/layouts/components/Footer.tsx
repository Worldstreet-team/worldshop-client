import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Footer, in the design sandbox's four-column shape: Buy, Sell, Support and
 * the wider WorldStreet ecosystem.
 *
 * The brand blurb and the category column that used to live here are gone. The
 * reference carries neither, the departments are already a bar at the top of
 * every page, and repeating them at the bottom made the footer twice the height
 * for nothing.
 */

type FooterLink = { label: string; to?: string; href?: string };

const BUY: FooterLink[] = [
  { label: "Browse listings", to: "/listings" },
  { label: "Stores", to: "/stores" },
  { label: "Malls", to: "/malls" },
  { label: "Saved items", to: "/saved" },
];

const SELL: FooterLink[] = [
  { label: "Create a listing", to: "/vendor/listings/new" },
  { label: "Open a store", to: "/vendor/register" },
  { label: "Open a mall", to: "/mall/register" },
  { label: "Seller tools", to: "/vendor" },
];

const SUPPORT: FooterLink[] = [
  { label: "Report a listing", to: "/listings" },
  { label: "Safety tips", to: "/terms" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Cookies", to: "/cookies" },
  // The header has no admin shortcut (the reference has none); this is the
  // way in. /admin asks for the admin password, so it is safe to list.
  { label: "Admin", to: "/admin" },
];

const ECOSYSTEM: FooterLink[] = [
  { label: "Dashboard", href: "https://dashboard.worldstreetgold.com" },
  { label: "Academy", href: "https://academy.worldstreetgold.com" },
  { label: "Xstream", href: "https://xstream.worldstreetgold.com" },
  { label: "Social", href: "https://social.worldstreetgold.com" },
];

function Column({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <nav aria-label={heading}>
      <h2 className="ws-footer__head">{heading}</h2>
      <ul className="ws-footer__links">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to}>{l.label}</Link>
            ) : (
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  // Saved is per-device and meaningless to a signed-out visitor.
  const buy = isAuthenticated ? BUY : BUY.filter((l) => l.to !== "/saved");

  return (
    <footer className="ws-footer">
      <div className="ws-wrap">
        <div className="ws-footer__grid">
          <Column heading="Buy" links={buy} />
          <Column heading="Sell" links={SELL} />
          <Column heading="Support" links={SUPPORT} />
          <Column heading="WorldStreet" links={ECOSYSTEM} />
        </div>

        <p className="ws-footer__base">
          Buy and sell directly with sellers across Nigeria. Escrow holds the
          money until the item arrives as described. &copy; {currentYear}{" "}
          WorldStreet.
        </p>
      </div>
    </footer>
  );
}
