import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

/**
 * The location scope inside the search pill. A native <select> popup cannot be
 * styled (on Windows it rendered white-on-white against the glass pill), so
 * this is a custom popover listbox: a button opening a scrollable panel of
 * states, all on design tokens.
 *
 * Options are real <button>s, so keyboard access comes for free (Tab/Enter);
 * ArrowUp/Down walk the list, Escape closes and returns focus to the trigger.
 */
export default function LocationSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (state: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  }, [open]);

  const moveFocus = (delta: number) => {
    const items = [...(listRef.current?.querySelectorAll('button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[Math.min(Math.max(i + delta, 0), items.length - 1)]?.focus();
  };

  const pick = (state: string) => {
    onChange(state);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="ws-locpick" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="ws-locpick__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by location"
      >
        <MapPin size={16} aria-hidden />
        <span>{value || 'All Nigeria'}</span>
        <ChevronDown size={14} aria-hidden className="ws-locpick__chevron" />
      </button>

      {open && (
        <div
          className="ws-locpick__panel"
          role="listbox"
          aria-label="Location"
          ref={listRef}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            aria-current={!value}
            className={`ws-locpick__item${!value ? ' is-active' : ''}`}
            onClick={() => pick('')}
          >
            All Nigeria
            {!value && <Check size={14} aria-hidden />}
          </button>
          {NIGERIAN_STATES.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={value === s}
              aria-current={value === s}
              className={`ws-locpick__item${value === s ? ' is-active' : ''}`}
              onClick={() => pick(s)}
            >
              {s}
              {value === s && <Check size={14} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
