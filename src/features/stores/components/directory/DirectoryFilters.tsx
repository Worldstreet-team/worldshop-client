import { X } from 'lucide-react';
import type { DirectoryFilters as Filters } from '@/shared/hooks/useDirectoryFilters';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';

type DirectoryFiltersProps = {
  filters: Filters;
  /** "stores" / "malls" — names the controls for screen readers. */
  noun: string;
  total: number;
  open: boolean;
  onClose: () => void;
};

/**
 * The same rail the category pages use, with the one filter a directory has.
 * Location is not a detail here: it decides whether a buyer can reach the
 * place at all.
 */
export default function DirectoryFilters({
  filters,
  noun,
  total,
  open,
  onClose,
}: DirectoryFiltersProps) {
  const { country, state, countryName, tokens, setCountry, setState, clearAll } = filters;

  return (
    <>
      <div
        className={`ws-drawer__scrim ws-filters__scrim${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="directory-filters"
        className={`ws-filters${open ? ' is-open' : ''}`}
        aria-labelledby="directory-filters-title"
      >
        <div className="ws-filters__head">
          <h2 className="ws-filters__title" id="directory-filters-title">
            Filters
          </h2>
          {tokens.length > 0 && (
            <button type="button" className="ws-filters__reset" onClick={clearAll}>
              Reset
            </button>
          )}
          <button
            type="button"
            className="ws-iconbtn ws-filters__close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ws-filters__body">
          <details className="ws-filters__group" open>
            <summary className="ws-filters__legend">Location</summary>
            <div className="ws-filters__stack">
              <CountrySelect
                value={country}
                placeholder="All countries"
                onChange={(e) => setCountry(e.target.value)}
                aria-label={`Filter ${noun} by country`}
              />
              {country && (
                <StateSelect
                  country={country}
                  value={state}
                  placeholder={`All of ${countryName}`}
                  onChange={(e) => setState(e.target.value)}
                  aria-label={`Filter ${noun} by state or region`}
                />
              )}
            </div>
          </details>
        </div>

        <div className="ws-filters__foot">
          <button
            type="button"
            className="ws-btn ws-btn--primary ws-filters__done"
            onClick={onClose}
          >
            Show {total.toLocaleString('en-NG')} {total === 1 ? noun.slice(0, -1) : noun}
          </button>
        </div>
      </aside>
    </>
  );
}
