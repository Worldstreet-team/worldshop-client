import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Globe, MapPin } from 'lucide-react';
import { useLocations, useStatesOf } from '@/shared/hooks/useLocations';
import { getStateDisplayName } from '@/shared/utils/locations';

/**
 * The location scope inside the search pill. A native <select> popup cannot be
 * styled (on Windows it rendered white-on-white against the glass pill), so
 * this is a custom popover listbox: a button opening a scrollable panel, all
 * on design tokens.
 *
 * Two levels: the panel lists the chosen country's states under a "change
 * country" row; that row flips it into a searchable country list. Picking a
 * country applies immediately ("All of Zimbabwe") and drops back to its
 * states so the buyer can narrow further in the same open panel.
 *
 * Options are real <button>s, so keyboard access comes for free (Tab/Enter);
 * ArrowUp/Down walk the list, Escape closes and returns focus to the trigger.
 */
export default function LocationSelect({
  country,
  state,
  onChange,
}: {
  country: string;
  state: string;
  onChange: (country: string, state: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'states' | 'countries'>('states');
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { countries, countryOf } = useLocations();
  const { states, loading: statesLoading } = useStatesOf(country);

  const current = country ? countryOf(country) : undefined;
  const countryLabel = current?.name ?? country;

  // Click-away and Escape both close; Escape also restores focus so keyboard
  // users are not dropped at the document root.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Opening scrolls the current choice into view — panel-local scrolling only;
  // scrollIntoView would also scroll ancestors and nudge the page.
  useEffect(() => {
    const panel = listRef.current;
    const active = panel?.querySelector<HTMLElement>('[aria-current="true"]');
    if (open && panel && active) {
      panel.scrollTop = active.offsetTop - panel.clientHeight / 2;
    }
  }, [open, mode]);

  useEffect(() => {
    if (open && mode === 'countries') searchRef.current?.focus();
  }, [open, mode]);

  const moveFocus = (delta: number) => {
    const items = [...(listRef.current?.querySelectorAll('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[Math.min(Math.max(i + delta, 0), items.length - 1)]?.focus();
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pickState = (s: string) => {
    onChange(country, s);
    close();
  };

  const pickCountry = (code: string) => {
    onChange(code, '');
    setQuery('');
    setMode('states');
  };

  const clearAll = () => {
    onChange('', '');
    close();
  };

  const label = state
    ? `${getStateDisplayName(state)}, ${current?.code ?? country}`
    : country
      ? countryLabel
      : 'Anywhere';

  const q = query.trim().toLowerCase();
  const visibleCountries = q
    ? countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
    : countries;

  return (
    <div className="ws-locpick" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="ws-locpick__trigger"
        onClick={() => {
          // Reopening always starts at the chosen country's states (or the
          // country list when nothing is chosen), never a stale search.
          setMode(country ? 'states' : 'countries');
          setQuery('');
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by location"
      >
        {country ? <MapPin size={16} aria-hidden /> : <Globe size={16} aria-hidden />}
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden className="ws-locpick__chevron" />
      </button>

      {open && (
        <div
          className="ws-locpick__panel"
          role="listbox"
          aria-label="Location"
          ref={listRef}
          onKeyDown={(e) => {
            if (e.target === searchRef.current && e.key !== 'ArrowDown') return;
            if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
          }}
        >
          {mode === 'countries' ? (
            <>
              {country && (
                <button type="button" className="ws-locpick__nav" onClick={() => setMode('states')}>
                  <ChevronLeft size={14} aria-hidden />
                  Back to {countryLabel}
                </button>
              )}
              <input
                ref={searchRef}
                type="search"
                className="ws-locpick__search"
                placeholder="Search countries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search countries"
              />
              <button
                type="button"
                role="option"
                aria-selected={!country}
                aria-current={!country}
                className={`ws-locpick__item${!country ? ' is-active' : ''}`}
                onClick={clearAll}
              >
                🌍 Anywhere
                {!country && <Check size={14} aria-hidden />}
              </button>
              {visibleCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={country === c.code}
                  aria-current={country === c.code}
                  className={`ws-locpick__item${country === c.code ? ' is-active' : ''}`}
                  onClick={() => pickCountry(c.code)}
                >
                  <span>{c.flag} {c.name}</span>
                  {country === c.code && <Check size={14} aria-hidden />}
                </button>
              ))}
              {visibleCountries.length === 0 && (
                <p className="ws-locpick__empty">No country matches “{query}”</p>
              )}
            </>
          ) : (
            <>
              <button type="button" className="ws-locpick__nav" onClick={() => setMode('countries')}>
                <span>{current?.flag} {countryLabel}</span>
                <ChevronRight size={14} aria-hidden />
              </button>
              <button
                type="button"
                role="option"
                aria-selected={!state}
                aria-current={!state}
                className={`ws-locpick__item${!state ? ' is-active' : ''}`}
                onClick={() => pickState('')}
              >
                All of {countryLabel}
                {!state && <Check size={14} aria-hidden />}
              </button>
              {statesLoading && <p className="ws-locpick__empty">Loading regions…</p>}
              {states.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={state === s}
                  aria-current={state === s}
                  className={`ws-locpick__item${state === s ? ' is-active' : ''}`}
                  onClick={() => pickState(s)}
                >
                  {getStateDisplayName(s)}
                  {state === s && <Check size={14} aria-hidden />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
