import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  /** Renders in the danger tone. For actions that remove access or undo something. */
  danger?: boolean;
  disabled?: boolean;
}

const PANEL_WIDTH = 200;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

/**
 * A three-dots row action menu.
 *
 * The panel is portaled to <body> and positioned `fixed` rather than absolutely
 * inside the row. Table rows live in `.ws-card--flush.ws-table-wrap`, which
 * carries `overflow: hidden` and `overflow-x: auto` on the same element; CSS
 * resolves the hidden axis to auto when the other is auto, so that container
 * clips on both and an in-flow panel would be cut off on the lower rows and at
 * the right edge, exactly where this menu sits. A z-index cannot escape an
 * overflow clip, so escaping the container is the only fix.
 *
 * Follows LocationSelect's interaction shape: outside pointerdown closes,
 * Escape closes and restores focus, arrows walk the items.
 */
export default function RowMenu({
  items,
  label = 'Row actions',
  disabled,
}: {
  items: RowMenuItem[];
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  // Measured before paint so the panel never renders in the wrong place first.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    const height = panel?.offsetHeight ?? 0;

    // Flip above the trigger when there is not room below it, so the menu on
    // the last row of a long table stays on screen.
    const below = r.bottom + GAP;
    const flip = below + height > window.innerHeight - VIEWPORT_MARGIN;
    const top = flip ? Math.max(VIEWPORT_MARGIN, r.top - GAP - height) : below;

    // Right-aligned to the trigger, since the actions column is right-aligned.
    const left = Math.max(VIEWPORT_MARGIN, Math.min(
      r.right - PANEL_WIDTH,
      window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
    ));

    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    // A fixed panel does not travel with the row, so close instead of chasing
    // it. The table itself scrolls sideways, hence the capture phase.
    const onScroll = () => close();

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const moveFocus = (delta: number) => {
    const buttons = [...(panelRef.current?.querySelectorAll('button:not([disabled])') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    (buttons[Math.min(Math.max(i + delta, 0), buttons.length - 1)] as HTMLElement)?.focus();
  };

  const choose = (item: RowMenuItem) => {
    close(true);
    item.onSelect();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="ws-iconbtn"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <MoreVertical size={16} aria-hidden />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="ws-menu"
          role="menu"
          aria-label={label}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            width: PANEL_WIDTH,
            // Hidden until measured, so it cannot flash at the wrong position.
            visibility: pos ? 'visible' : 'hidden',
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`ws-menu__item${item.danger ? ' ws-menu__item--danger' : ''}`}
              onClick={() => choose(item)}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
