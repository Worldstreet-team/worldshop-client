import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import type { Listing, PublicStore } from "@/features/stores/api";
import { useHomeRails } from "@/features/listings/hooks/useHomeRails";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import Reveal from "@/shared/components/Reveal";
import HeroCarousel from "@/features/listings/components/HeroCarousel";
import ListingCard from "@/features/listings/components/ListingCard";
import ListingCardSkeleton from "@/features/listings/components/ListingCardSkeleton";
import StoreCard from "@/features/stores/components/StoreCard";
import StoreCardSkeleton from "@/features/stores/components/StoreCardSkeleton";

type Row = Listing & { store: PublicStore };


function SectionHead({
  id,
  eyebrow,
  title,
  sub,
  action,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="ws-sectionhead">
      <div>
        {eyebrow && <span className="ws-sectionhead__eyebrow">{eyebrow}</span>}
        <h2 className="ws-sectionhead__title" id={id}>
          {title}
        </h2>
        {sub && <p className="ws-sectionhead__sub">{sub}</p>}
      </div>
      {action && (
        <Link to={action.to} className="ws-sectionhead__action">
          {action.label}
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Section({
  id,
  children,
  ...head
}: Parameters<typeof SectionHead>[0] & { children: ReactNode }) {
  return (
    <Reveal as="section" aria-labelledby={id}>
      <SectionHead id={id} {...head} />
      {children}
    </Reveal>
  );
}

function Rail({
  id,
  eyebrow,
  title,
  sub,
  to,
  items,
  loading,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  to: string;
  items: Row[];
  loading: boolean;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <Section
      id={id}
      eyebrow={eyebrow}
      title={title}
      sub={sub}
      action={{ label: "See all", to }}
    >
      <div className="ws-rail__track ws-bleed">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <ListingCardSkeleton key={i} showSeller />
            ))
          : items.map((l, i) => (
              <Reveal className="ws-reveal" index={i} key={l.id}>
                <ListingCard listing={l} showSeller />
              </Reveal>
            ))}
      </div>
    </Section>
  );
}

const ASSURANCES = [
  {
    Icon: MessageCircle,
    title: "Deal direct",
    copy: "Chat with the seller — no middlemen, no markups.",
  },
  {
    Icon: ShieldCheck,
    title: "Know your seller",
    copy: "Public ratings, reviews and verification on every store.",
  },
  {
    Icon: Tag,
    title: "Meet safely",
    copy: "Check the item in person before any money moves.",
  },
];

const SELL_STEPS = [
  {
    title: "Open your store",
    copy: "Pick a name, add your location and contact.",
  },
  {
    title: "Post your listing",
    copy: "Photos, price, condition — live in minutes.",
  },
  {
    title: "Chat and close",
    copy: "Buyers message you directly. Agree your own terms.",
  },
];

export default function Home() {
  usePageTitle();
  const {
    vehiclesId,
    total,
    newest,
    sellers,
    loading,
    sellersLoading,
  } = useHomeRails();

  return (
    <>
      <HeroCarousel
        motorsTo={
          vehiclesId ? `/listings?categoryId=${vehiclesId}` : "/listings"
        }
        stat={total}
      />

      <div className="ws-wrap">
        <div className="ws-home">
          <Rail
            id="home-newest"
            eyebrow="Just listed"
            title="New arrivals"
            sub="The most recent listings across every category."
            to="/listings"
            items={newest}
            loading={loading}
          />

          {(sellersLoading || sellers.length > 0) && (
            <Section
              id="home-sellers"
              eyebrow="Sellers"
              title="Stores to know"
              sub="Rated stores with listings live on the marketplace right now."
              action={{ label: "See all", to: "/stores" }}
            >
              <div className="ws-sellers">
                {sellersLoading
                  ? Array.from({ length: 3 }, (_, i) => (
                      <StoreCardSkeleton key={i} />
                    ))
                  : sellers.map((s, i) => (
                      <Reveal className="ws-reveal" index={i} key={s.id}>
                        <StoreCard store={s} />
                      </Reveal>
                    ))}
              </div>
            </Section>
          )}

          <Reveal as="section" className="ws-sellband" aria-labelledby="home-sell">
            <div className="ws-sellband__intro">
              <span className="ws-sellband__eyebrow">Start selling</span>
              <h2 className="ws-sellband__title" id="home-sell">
                Selling? List it in minutes.
              </h2>
              <p className="ws-sellband__sub">
                Open a store, post your first listing and talk to buyers
                directly. What you sell is yours — WorldStore takes no
                commission.
              </p>
              <div className="ws-sellband__actions">
                <Link
                  to="/vendor"
                  className="ws-btn ws-btn--primary ws-sellband__cta"
                >
                  Open a store
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <span className="ws-sellband__note">
                  Free · takes about two minutes
                </span>
              </div>
            </div>

            <ol className="ws-sellband__steps">
              {SELL_STEPS.map((step, i) => (
                <li className="ws-sellband__step" key={step.title}>
                  <span className="ws-sellband__num ws-num" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="ws-sellband__steptitle">{step.title}</h3>
                    <p className="ws-sellband__stepcopy">{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="section" className="ws-assure" aria-label="How WorldStore works">
            {ASSURANCES.map(({ Icon, title, copy }) => (
              <div className="ws-assure__item" key={title}>
                <span className="ws-assure__icon" aria-hidden>
                  <Icon size={17} />
                </span>
                <h3 className="ws-assure__title">{title}</h3>
                <p className="ws-assure__copy">{copy}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </>
  );
}
