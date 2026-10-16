"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownIcon, ArrowRightIcon, MenuSquareIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { categoryIcon } from "@ws/features/home/category-icons";
import type { NavCategory } from "./categories";

/* CategoryMenuButton + MegaMenu (spec §3.1, eBay "Shop by category"), desktop only. A
   native popover under the header: the categories on the left; pointing at or
   focusing one previews its newest listings on the right with "See all". Escape and
   clicking away close it (popover), and it closes after navigating. The data has one
   level of categories, so there's no second column of subcategories yet. */
export function MegaMenu({ categories }: { categories: readonly NavCategory[] }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(categories[0]?.id);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();

  // Close after navigating, but not on first mount (it may have been opened before
  // scripts loaded).
  const shownFor = useRef(`${pathname}?${params}`);
  useEffect(() => {
    const at = `${pathname}?${params}`;
    if (shownFor.current === at) return;
    shownFor.current = at;
    panel.current?.hidePopover();
  }, [pathname, params]);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const onToggle = (e: Event) => {
      const isOpen = (e as ToggleEvent).newState === "open";
      setOpen(isOpen);
      // Drop down from the header's bottom edge, wherever the header is now.
      if (isOpen) el.style.top = `${el.closest("header")?.getBoundingClientRect().bottom ?? 0}px`;
    };
    el.addEventListener("toggle", onToggle);
    // Opened before scripts loaded (popovertarget works without them): catch up.
    const frame = requestAnimationFrame(() => el.matches(":popover-open") && setOpen(true));
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("toggle", onToggle);
    };
  }, []);

  const current = categories.find((c) => c.id === active) ?? categories[0];

  return (
    <>
      <button type="button" className={buttonClass({ variant: "quiet", className: "ws-mega__button" })} popoverTarget={id} aria-expanded={open} aria-controls={id}>
        <MenuSquareIcon />
        Shop by category
        <ArrowDownIcon />
      </button>
      <div ref={panel} id={id} popover="auto" className="ws-mega" aria-label="Shop by category">
        <div className="cx-container ws-mega__inner">
          <ul className="ws-mega__list">
            {categories.map((c) => {
              const Icon = categoryIcon(c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/search?cat=${c.id}`}
                    className="ws-mega__cat"
                    data-active={c.id === current?.id || undefined}
                    onPointerEnter={() => setActive(c.id)}
                    onFocus={() => setActive(c.id)}
                  >
                    <Icon />
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          {current && (
            <section className="ws-mega__preview" aria-label={`New in ${current.name}`}>
              <div className="ws-mega__head">
                <p className="ws-mega__title">New in {current.name}</p>
                <Link href={`/search?cat=${current.id}`} className="cx-link ws-mega__all">
                  See all
                  <span className="cx-sr-only"> in {current.name}</span>
                  <ArrowRightIcon />
                </Link>
              </div>
              <ul className="ws-mega__items">
                {current.listings.map((l) => (
                  <li key={l.id}>
                    <Link href={l.href} className="ws-mega__item">
                      <span className="ws-mega__thumb">{l.photo && <Image src={l.photo} alt="" fill sizes="160px" quality={60} />}</span>
                      <span className="ws-mega__item-title">{l.title}</span>
                      <span className="ws-mega__item-price">{l.price}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
