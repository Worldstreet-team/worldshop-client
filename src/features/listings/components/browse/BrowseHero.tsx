import type { Category } from '@/features/catalog/types';
import MarketplaceSearch from '@/features/listings/components/MarketplaceSearch';

type BrowseHeroProps = {
  eyebrow: string;
  title: string;
  sub: string;
  parents: Category[];
  activeParentId: string;
  onPickCategory: (id: string | null) => void;
};

export default function BrowseHero({
  eyebrow,
  title,
  sub,
  parents,
  activeParentId,
  onPickCategory,
}: BrowseHeroProps) {
  return (
    <section className="ws-browsehero" aria-labelledby="browse-title">
      <div className="ws-wrap">
        <div className="ws-browsehero__inner">
          <div>
            <span className="ws-hero__eyebrow">{eyebrow}</span>
            <h1 className="ws-browsehero__title" id="browse-title">
              {title}
            </h1>
            <p className="ws-browsehero__sub">{sub}</p>
          </div>

          <MarketplaceSearch />

          {parents.length > 0 && (
            <div className="ws-catchips ws-bleed" role="group" aria-label="Categories">
              <button
                type="button"
                className="ws-chip"
                aria-pressed={!activeParentId}
                onClick={() => onPickCategory(null)}
              >
                All
              </button>
              {parents.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="ws-chip"
                  aria-pressed={c.id === activeParentId}
                  onClick={() => onPickCategory(c.id === activeParentId ? null : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
