import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Search } from 'lucide-react';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { useSearchSuggestions } from '@/features/listings/hooks/useSearchSuggestions';
import { firstImage, priceLabel } from '@/features/listings/model';

const MAX_CATEGORIES = 3;

type Item = { key: string; to: string; label: string; detail?: string; thumb?: string | null; kind: 'category' | 'listing' | 'search' };

/**
 * Type-ahead for a search box: matching categories, the top matching
 * listings, and a last row that runs the full search. Returns the props the
 * input needs (a combobox, driven by arrow keys, Enter and Escape) and the
 * dropdown to render beside it, so each search form keeps its own layout.
 *
 * Categories match on the client from the list the header already loads;
 * listings come from the API, debounced, five at most.
 */
export function useSearchSuggest(term: string) {
  const navigate = useNavigate();
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  // Closed by Escape or a pick until the person types again.
  const [dismissed, setDismissed] = useState(false);

  const q = term.trim();
  const open = focused && !dismissed && q.length >= 2;
  const { suggestions, suggestLoading } = useSearchSuggestions(term, focused && !dismissed);
  const { categories } = useCategories();

  const items = useMemo<Item[]>(() => {
    if (q.length < 2) return [];
    const needle = q.toLowerCase();
    const byId = new Map(categories.map((c) => [c.id, c]));
    const cats = categories
      .filter((c) => c.isActive !== false && c.name.toLowerCase().includes(needle))
      // Names that start with the term first, then the rest.
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(needle)) - Number(!b.name.toLowerCase().startsWith(needle)))
      .slice(0, MAX_CATEGORIES)
      .map<Item>((c) => ({
        key: `c-${c.id}`,
        to: `/categories/${c.slug}`,
        label: c.name,
        detail: c.parentId ? `in ${byId.get(c.parentId)?.name ?? 'a category'}` : 'Category',
        kind: 'category',
      }));
    const listings = suggestions.map<Item>((l) => ({
      key: `l-${l.id}`,
      to: `/listings/${l.slug || l.id}`,
      label: l.name,
      detail: priceLabel(l),
      thumb: firstImage(l),
      kind: 'listing',
    }));
    return [
      ...cats,
      ...listings,
      { key: 'search', to: `/listings?search=${encodeURIComponent(q)}`, label: `Search for “${q}”`, kind: 'search' },
    ];
  }, [q, categories, suggestions]);

  const go = (item: Item) => {
    setDismissed(true);
    setActive(-1);
    navigate(item.to);
  };

  const inputProps = {
    role: 'combobox' as const,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-activedescendant': open && active >= 0 ? `${listId}-${active}` : undefined,
    autoComplete: 'off',
    onFocus: () => setFocused(true),
    // Delayed so a click on a suggestion lands before the list closes.
    onBlur: () => setTimeout(() => setFocused(false), 150),
    onInput: () => {
      setDismissed(false);
      setActive(-1);
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (i + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
      } else if (e.key === 'Escape') {
        setDismissed(true);
        setActive(-1);
      } else if (e.key === 'Enter' && active >= 0) {
        // A highlighted suggestion wins over submitting the typed text.
        e.preventDefault();
        go(items[active]);
      }
    },
  };

  const dropdown = open ? (
    <ul className="ws-suggest" id={listId} role="listbox" aria-label="Search suggestions">
      {items.map((item, i) => (
        <li
          key={item.key}
          id={`${listId}-${i}`}
          role="option"
          aria-selected={i === active}
          className={`ws-suggest__item${i === active ? ' is-active' : ''}${item.kind === 'search' ? ' ws-suggest__item--search' : ''}`}
          // mousedown, not click: it fires before the input's blur closes the list.
          onMouseDown={(e) => {
            e.preventDefault();
            go(item);
          }}
          onMouseEnter={() => setActive(i)}
        >
          <span className="ws-suggest__icon" aria-hidden>
            {item.kind === 'listing' ? (
              item.thumb ? <img src={item.thumb} alt="" /> : <Search size={16} />
            ) : item.kind === 'category' ? (
              <Folder size={16} />
            ) : (
              <Search size={16} />
            )}
          </span>
          <span className="ws-suggest__text">
            <span className="ws-suggest__label">{item.label}</span>
            {item.detail && <span className="ws-suggest__detail">{item.detail}</span>}
          </span>
        </li>
      ))}
      {suggestLoading && suggestions.length === 0 && (
        <li className="ws-suggest__status" role="presentation">Finding listings…</li>
      )}
    </ul>
  ) : null;

  return { inputProps, dropdown };
}
