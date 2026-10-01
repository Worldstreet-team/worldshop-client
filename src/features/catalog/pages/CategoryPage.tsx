import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FolderSearch, PackageOpen, SlidersHorizontal, X } from 'lucide-react';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { useCategoryListings } from '@/features/catalog/hooks/useCategoryListings';
import {
  CONDITION_LABEL,
  PRICE_BANDS,
  SORTS,
  activeCount,
  applyFilters,
  sortRows,
  useCategoryFilters,
  type CategoryFilterState,
} from '@/features/catalog/categoryFilters';
import { departmentsWithStock, listingCount, subtreeCount } from '@/features/catalog/categoryTree';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import CategoryFilters from '@/features/catalog/components/CategoryFilters';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import Modal from '@/shared/components/common/Modal';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="ws-cxempty">
      <div className="ws-cxempty__inner">
        <span className="ws-cxempty__icon">{icon}</span>
        <p className="ws-cxempty__title">{title}</p>
        <p className="ws-cxempty__body">{children}</p>
        <div className="ws-cxempty__action">{action}</div>
      </div>
    </div>
  );
}

/** One removable chip per active filter, in the order the panel lists them. */
function activeTokens(f: CategoryFilterState, set: (p: Partial<CategoryFilterState>) => void) {
  return [
    ...(f.price ? [{ key: 'price', label: PRICE_BANDS[f.price].label, clear: () => set({ price: null }) }] : []),
    ...(f.rating ? [{ key: 'rating', label: `${f.rating}★ and up`, clear: () => set({ rating: null }) }] : []),
    ...f.conditions.map((c) => ({
      key: `c-${c}`,
      label: CONDITION_LABEL[c] ?? c,
      clear: () => set({ conditions: f.conditions.filter((x) => x !== c) }),
    })),
    ...(f.free ? [{ key: 'free', label: 'Free delivery', clear: () => set({ free: false }) }] : []),
    ...(f.reduced ? [{ key: 'reduced', label: 'Reduced price', clear: () => set({ reduced: false }) }] : []),
    ...(f.verified ? [{ key: 'verified', label: 'Verified sellers', clear: () => set({ verified: false }) }] : []),
  ];
}

/**
 * /categories/:slug — a department or one of its sections, ported from the
 * sandbox's category page: sections and filters down the side, the listings
 * beside them. A section page is the same page with its department's
 * sections still listed and the current one marked, so moving sideways is
 * one click.
 */
export default function CategoryPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { filters, sort, setFilters, setSort, clearAll } = useCategoryFilters();
  const [sheetOpen, setSheetOpen] = useState(false);

  const found = categories.find((c) => c.slug === slug);
  const department = found?.parentId ? categories.find((c) => c.id === found.parentId) : found;
  const section = found?.parentId ? found : undefined;

  const sections = useMemo(
    () =>
      department
        ? categories
            .filter((c) => c.parentId === department.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [categories, department],
  );
  const queryIds = useMemo(
    () => (section ? [section.id] : sections.length ? sections.map((s) => s.id) : department ? [department.id] : []),
    [section, sections, department],
  );

  const { rows, loading, failed, retry } = useCategoryListings(queryIds);
  const shown = useMemo(() => sortRows(applyFilters(rows, filters), sort), [rows, filters, sort]);
  const active = activeCount(filters);
  const tokens = activeTokens(filters, setFilters);
  const hasRows = rows.length > 0;

  usePageTitle(found ? found.name : 'Categories');

  if (!categoriesLoading && (!found || !department)) {
    return (
      <div className="ws-wrap ws-cx">
        <CategoryHead
          crumbs={[{ label: 'All categories', to: '/categories' }, { label: 'Not found' }]}
          eyebrow="Category"
          title="Not found"
        >
          There is no category at this address.
        </CategoryHead>
        <div className="ws-cxstack">
          <Empty
            icon={<FolderSearch size={20} aria-hidden />}
            title="No such category"
            action={
              <Link to="/categories" className="ws-btn ws-btn--sm ws-btn--secondary">
                All categories
              </Link>
            }
          >
            That link points outside the directory. The directory has every department.
          </Empty>
        </div>
      </div>
    );
  }

  const deptTotal = department ? subtreeCount(categories, department.id) : 0;
  const label = section?.name ?? department?.name ?? '';
  // Where to send someone from an empty department: the biggest one with stock.
  const fallback = departmentsWithStock(categories).find((d) => d.id !== department?.id);

  return (
    <div className="ws-wrap ws-cx">
      <CategoryHead
        crumbs={[
          { label: 'All categories', to: '/categories' },
          ...(department ? [{ label: department.name, to: `/categories/${department.slug}` }] : []),
          ...(section ? [{ label: section.name }] : []),
        ]}
        eyebrow={categoriesLoading ? 'Category' : deptTotal > 0 ? listingCount(deptTotal) : 'Category'}
        title={found?.name ?? ''}
      >
        {loading || hasRows
          ? 'Listings from sellers across WorldStore. Escrow holds the money until the buyer confirms it arrived.'
          : 'This is in the directory but has nothing listed yet, only the sections it holds.'}
      </CategoryHead>

      {sections.length > 0 && (
        <div className="ws-cxpills" role="group" aria-label={`Sections in ${department?.name}`}>
          {sections.map((s) => {
            const on = s.id === section?.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                className={`ws-pill ws-cxpill ws-cxpill--lg${on ? ' is-on' : ''}`}
                onClick={() => navigate(on ? `/categories/${department!.slug}` : `/categories/${s.slug}`)}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="ws-cxlayout">
        <aside className="ws-cxaside">
          {sections.length > 0 && (
            <nav aria-label="Sections" className="ws-cxsections">
              <h2 className="ws-cxsections__title">Sections</h2>
              <ul>
                {sections.map((s) => {
                  const on = s.id === section?.id;
                  const n = s.productCount ?? 0;
                  return (
                    <li key={s.id}>
                      <Link
                        to={on ? `/categories/${department!.slug}` : `/categories/${s.slug}`}
                        aria-current={on ? 'page' : undefined}
                        className={`ws-cxsections__link${on ? ' is-on' : ''}`}
                      >
                        <span className="ws-cxsections__name">{s.name}</span>
                        {n > 0 && <span className="ws-cxsections__count">{listingCount(n)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          {hasRows && (
            <div className="ws-cxaside__sticky">
              <CategoryFilters rows={rows} value={filters} onChange={setFilters} onClear={clearAll} />
            </div>
          )}
        </aside>

        <section className="ws-cxresults" aria-labelledby="branch-listings">
          <div className="ws-all__head">
            <h2 className="ws-all__title" id="branch-listings">
              {section ? `${section.name} in ${department?.name}` : label}
            </h2>
            <div className="ws-all__controls">
              <p className="ws-all__count ws-num" aria-live="polite">
                {loading
                  ? 'Loading listings…'
                  : `${listingCount(shown.length)}${active ? ` of ${rows.length}` : ''}`}
              </p>
              {hasRows && (
                <>
                  <button
                    type="button"
                    className="ws-btn ws-btn--sm ws-btn--secondary ws-cxresults__filters"
                    onClick={() => setSheetOpen(true)}
                  >
                    <SlidersHorizontal size={14} aria-hidden />
                    Filters{active ? ` (${active})` : ''}
                  </button>
                  <div className="ws-segmented" role="group" aria-label="Sort listings">
                    {SORTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={sort === s.value}
                        className={`ws-segmented__btn${sort === s.value ? ' is-active' : ''}`}
                        onClick={() => setSort(s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {tokens.length > 0 && (
            <div className="ws-cxtokens">
              {tokens.map((t) => (
                <button key={t.key} type="button" className="ws-pill ws-cxtoken" onClick={t.clear}>
                  {t.label}
                  <X size={14} aria-hidden />
                  <span className="ws-sr-only">Remove filter</span>
                </button>
              ))}
              <button type="button" className="ws-cxghost" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {loading || categoriesLoading ? (
            <div className="ws-results ws-cxgrid" aria-busy="true" aria-label="Loading listings">
              {Array.from({ length: 8 }, (_, i) => (
                <ListingCardSkeleton key={i} showSeller />
              ))}
            </div>
          ) : failed ? (
            <Empty
              icon={<PackageOpen size={20} aria-hidden />}
              title="Could not load listings"
              action={
                <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={retry}>
                  Try again
                </button>
              }
            >
              Check your connection and try again. Your filters are still set.
            </Empty>
          ) : shown.length > 0 ? (
            <div className="ws-results ws-cxgrid" key={`${slug}-${sort}`}>
              {shown.map((l) => (
                <ListingCard key={l.id} listing={l} showSeller />
              ))}
            </div>
          ) : hasRows ? (
            <Empty
              icon={<SlidersHorizontal size={20} aria-hidden />}
              title="Nothing matches those filters"
              action={
                <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={clearAll}>
                  Clear filters
                </button>
              }
            >
              All {rows.length} {label} {rows.length === 1 ? 'listing is' : 'listings are'} still here.
              Clear a filter to see them.
            </Empty>
          ) : (
            <Empty
              icon={<PackageOpen size={20} aria-hidden />}
              title={`Nothing listed in ${label} yet`}
              action={
                fallback ? (
                  <Link to={`/categories/${fallback.slug}`} className="ws-btn ws-btn--sm ws-btn--secondary">
                    Browse {fallback.name}
                  </Link>
                ) : (
                  <Link to="/categories" className="ws-btn ws-btn--sm ws-btn--secondary">
                    All categories
                  </Link>
                )
              }
            >
              No seller has filed anything here so far. The rest of the marketplace is one click away.
            </Empty>
          )}
        </section>
      </div>

      {/* Below the desktop layout the filters leave the sidebar for a sheet. */}
      <Modal
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="ws-cxsheet__foot">
            {active > 0 && (
              <button type="button" className="ws-btn ws-btn--secondary" onClick={clearAll}>
                Clear all
              </button>
            )}
            <button type="button" className="ws-btn ws-btn--primary" onClick={() => setSheetOpen(false)}>
              Show {listingCount(shown.length)}
            </button>
          </div>
        }
      >
        <p className="ws-cxsheet__desc">
          {shown.length.toLocaleString('en-NG')} of {rows.length.toLocaleString('en-NG')} {label} listings
        </p>
        <CategoryFilters rows={rows} value={filters} onChange={setFilters} onClear={clearAll} chrome={false} />
      </Modal>
    </div>
  );
}
