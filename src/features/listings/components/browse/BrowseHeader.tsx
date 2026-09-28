import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Category } from '@/features/catalog/types';
import MarketplaceSearch from '@/features/listings/components/MarketplaceSearch';

type BrowseHeaderProps = {
  title: string;
  /** The category the results sit in, for the trail. */
  parent?: Category;
  selected?: Category;
  search: string;
};

/**
 * A category page's head: where you are, what you are looking at, and a way to
 * search from here. Deliberately short — the results are the page, and a band
 * with a headline and a strapline pushed the first row of products off screen.
 */
export default function BrowseHeader({ title, parent, selected, search }: BrowseHeaderProps) {
  const trail = [parent, selected?.id === parent?.id ? undefined : selected].filter(
    (c): c is Category => Boolean(c),
  );

  return (
    <div className="ws-browsehead">
      <nav className="ws-crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} aria-hidden />
        {trail.length === 0 && !search ? (
          <span aria-current="page">Marketplace</span>
        ) : (
          <Link to="/listings">Marketplace</Link>
        )}
        {trail.map((c, i) => (
          <span key={c.id} className="ws-crumbs__step">
            <ChevronRight size={14} aria-hidden />
            {i === trail.length - 1 ? (
              <span aria-current="page">{c.name}</span>
            ) : (
              <Link to={`/listings?categoryId=${c.id}`}>{c.name}</Link>
            )}
          </span>
        ))}
        {search && (
          <>
            <ChevronRight size={14} aria-hidden />
            <span aria-current="page" className="ws-crumbs__here">
              “{search}”
            </span>
          </>
        )}
      </nav>

      <div className="ws-browsehead__row">
        <h1 className="ws-browsehead__title">{title}</h1>
        <MarketplaceSearch className="ws-browsehead__search" />
      </div>
    </div>
  );
}
