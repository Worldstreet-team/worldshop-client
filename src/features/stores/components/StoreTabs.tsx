import { useRef, type KeyboardEvent } from 'react';
import { panelId, tabId } from '@/features/stores/model';

export type StoreTab<K extends string> = { key: K; label: string; count?: number };

type StoreTabsProps<K extends string> = {
  idPrefix: string;
  tabs: StoreTab<K>[];
  active: K;
  onChange: (key: K) => void;
};

// WAI-ARIA tabs: one tab stop for the row, arrow keys move between tabs.
export default function StoreTabs<K extends string>({ idPrefix, tabs, active, onChange }: StoreTabsProps<K>) {
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
    <div className="ws-storetabs" role="tablist" aria-label="Store sections">
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
            className="ws-storetabs__tab"
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
            {t.count != null && <span className="ws-storetabs__count ws-num">{t.count.toLocaleString()}</span>}
          </button>
        );
      })}
    </div>
  );
}
