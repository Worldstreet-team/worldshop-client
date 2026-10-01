import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { listingCount, subtreeCount } from '@/features/catalog/categoryTree';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import { departmentIcon, OUTLINED } from '@/features/catalog/departmentIcons';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

// Sections listed under each department before the "N more" link takes over.
const SHOWN = 5;

const NUMBER_WORDS = [
  'No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
];
const inWords = (n: number) => NUMBER_WORDS[n] ?? n.toLocaleString('en-NG');

/**
 * /categories — every department and its sections on one screen, ported from
 * the sandbox's directory.
 *
 * Unlike the header bar, which drops empty departments, this shows all of
 * them: it is the map of the catalogue, and a department with nothing in it
 * yet still tells a seller where their stock would go.
 */
export default function Categories() {
  usePageTitle('All categories');
  const { categories, isLoading } = useCategories();

  const departments = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => ({
          ...d,
          total: subtreeCount(categories, d.id),
          sections: categories
            .filter((c) => c.parentId === d.id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        })),
    [categories],
  );
  const stocked = departments.filter((d) => d.total > 0).length;

  return (
    <div className="ws-wrap ws-cx">
      <CategoryHead crumbs={[{ label: 'All categories' }]} eyebrow="Browse" title="All categories">
        {isLoading
          ? 'The whole map of the marketplace on one screen.'
          : departments.length === 0
            ? 'The category list could not be loaded right now. Try again in a moment.'
            : `${inWords(departments.length)} departments, the whole map on one screen. ${inWords(stocked)} of them have listings today. The rest still list their sections, so you can see where things will go.`}
      </CategoryHead>

      <ul className="ws-cxmap" aria-busy={isLoading || undefined}>
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="ws-cxmap__cell">
                <span className="ws-cxmap__skeleton" aria-hidden />
              </li>
            ))
          : departments.map((d) => {
              const Icon = departmentIcon(d.name);
              const more = d.sections.length - SHOWN;
              return (
                <li key={d.id} className="ws-cxmap__cell">
                  <Link to={`/categories/${d.slug}`} className="ws-cxmap__dept">
                    <span className="ws-cxmap__icon">
                      <Icon size={18} fill={OUTLINED.has(Icon) ? 'none' : 'currentColor'} aria-hidden />
                    </span>
                    <span className="ws-cxmap__text">
                      <span className="ws-cxmap__name">
                        {d.name}
                        <ChevronRight size={16} aria-hidden className="ws-cxmap__chev" />
                      </span>
                      <span className="ws-cxmap__count">
                        {d.total > 0 ? listingCount(d.total) : 'Nothing listed yet'}
                      </span>
                    </span>
                  </Link>

                  {d.sections.length > 0 && (
                    <ul className="ws-cxmap__sections">
                      {d.sections.slice(0, SHOWN).map((s) => {
                        const n = s.productCount ?? 0;
                        return (
                          <li key={s.id}>
                            <Link to={`/categories/${s.slug}`} className="ws-cxmap__section">
                              <span className="ws-cxmap__sname">{s.name}</span>
                              {n > 0 && <span className="ws-cxmap__scount">{listingCount(n)}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {more > 0 && (
                    <Link to={`/categories/${d.slug}`} className="ws-cxmap__more">
                      {more} more {more === 1 ? 'section' : 'sections'}
                    </Link>
                  )}
                </li>
              );
            })}
      </ul>
    </div>
  );
}
