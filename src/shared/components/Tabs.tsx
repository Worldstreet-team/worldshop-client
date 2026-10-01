import { useRef, type KeyboardEvent } from 'react';
import { panelId, tabId } from '@/shared/lib/tabs';

export type Tab<K extends string> = { key: K; label: string; count?: number };

type TabsProps<K extends string> = {
  idPrefix: string;
  tabs: Tab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Names the row for screen readers — "Store sections", "Listing details". */
  label: string;
  /** Block name for the row, its tabs and counts. The listing page has its own look. */
  block?: string;
};

// WAI-ARIA tabs: one tab stop for the row, arrow keys move between tabs.
export default function Tabs<K extends string>({
  idPrefix, tabs, active, onChange, label, block = 'ws-storetabs',
}: TabsProps<K>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div className={block} role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={tabId(idPrefix, t.key)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, t.key)}
            tabIndex={selected ? 0 : -1}
            className={`${block}__tab`}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.count != null && <span className={`${block}__count ws-num`}>{t.count.toLocaleString()}</span>}
          </button>
        );
      })}
    </div>
  );
}
