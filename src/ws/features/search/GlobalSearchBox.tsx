"use client";

import { localFetch } from "@ws/compat/localApi";
import { AnimatePresence, m } from "motion/react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type FocusEvent, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { ArrowDownIcon, ArrowUpGraphIncreaseIcon, ClockIcon, ImageIcon, MagnifyingGlassIcon, MenuSquareIcon, StoreIcon, XmarkCircleIcon } from "@ws/components/icons";
import { useMagnetic } from "@ws/components/motion/useMagnetic";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { cx } from "@ws/lib/cx";
import { spring } from "@ws/lib/motion/tokens";
import type { Suggestion } from "@ws/lib/search/suggest";
import { suggestionMatch } from "@ws/lib/search/words";
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches } from "./recent";
import { SuggestionText } from "./SuggestionText";

/* GlobalSearchBox (spec §3.1, flows B2 steps 1–2): a GET form to /search (next/form:
   works before scripts, navigates client-side after).
   - Empty or one character: recent and trending searches.
   - Two or more: live suggestions from /api/suggest after a 150 ms pause, in groups:
     searches (completions and "q in Category"), sellers, listings; at most 10 rows
     (6 on phones). If they fail, recent searches still show (B2 errors).
   - A category scope select (All categories by default) next to the field.
   - On phones, focusing the field opens it full screen with Cancel (spec §16.2).
   Behaviour from the UI research (Baymard autocomplete, eBay combobox, WAI-ARIA APG):
   suggestions bold the part not typed; ↑ ↓ put a search suggestion in the field and
   Escape puts back what was typed; seller and listing rows open their page; a Clear
   button; recent searches removable (Shift+Delete or ×). */

type Props = {
  defaultValue?: string;
  trending: readonly string[];
  /** Params to keep on a new search, e.g. a non-default radius. */
  keep?: Record<string, string>;
  /** False after a prohibited search (EC-004): no suggestions at all. */
  suggestions?: boolean;
  /** A term never to keep in recent searches (the prohibited one just searched). */
  forget?: string;
  /** Id for the input (the skip link "Skip to search" targets the header's box). */
  inputId?: string;
  /** Categories for the scope select; none = no select. */
  scopes?: readonly { id: string; name: string }[];
  /** The scope in force (the current ?cat=). */
  scope?: string;
};

type Option =
  | { kind: "recent" | "trending" | "query"; term: string }
  | { kind: "category"; term: string; cat: string; name: string }
  | { kind: "seller" | "listing"; term: string; href: string };

const GROUPS: { label: string; kinds: Option["kind"][] }[] = [
  { label: "Recent searches", kinds: ["recent"] },
  { label: "Trending", kinds: ["trending"] },
  { label: "Searches", kinds: ["query", "category"] },
  { label: "Sellers", kinds: ["seller"] },
  { label: "Listings", kinds: ["listing"] },
];

const ICONS: Record<Option["kind"], ComponentType> = {
  recent: ClockIcon,
  trending: ArrowUpGraphIncreaseIcon,
  query: MagnifyingGlassIcon,
  category: MenuSquareIcon,
  seller: StoreIcon,
  listing: ImageIcon,
};

const PHONE = "(max-width: 767px)";
const isPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE).matches;
const isLink = (o: Option): o is Extract<Option, { href: string }> => "href" in o;

export function GlobalSearchBox({ defaultValue = "", trending, keep = {}, suggestions = true, forget, inputId, scopes, scope: initialScope = "" }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  useMagnetic(submitRef);
  /** What the buyer typed (filters the list) and what the field shows (follows ↑ ↓). */
  const [typed, setTyped] = useState(defaultValue);
  const [value, setValue] = useState(defaultValue);
  const [scope, setScope] = useState(initialScope);
  const [open, setOpen] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [active, setActive] = useState(-1);
  const [live, setLive] = useState<{ for: string; items: Suggestion[] }>({ for: "", items: [] });
  const recents = useRecentSearches();

  useEffect(() => {
    if (forget) removeRecentSearch(forget);
  }, [forget]);

  // Text typed before scripts loaded (slow phones) is in the field but not in state, so
  // the next render would wipe it. Adopt it once, right after hydration.
  useEffect(() => {
    const early = inputRef.current?.value;
    if (early === undefined || early === defaultValue) return;
    const frame = requestAnimationFrame(() => {
      setTyped(early);
      setValue(early);
    });
    return () => cancelAnimationFrame(frame);
  }, [defaultValue]);

  const q = typed.trim();
  const typing = suggestions && q.length >= rules.search.minChars;

  // Live suggestions after a pause in typing (B2: 150 ms). A failure leaves the list
  // empty, so recent searches still show.
  useEffect(() => {
    if (!typing) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const max = isPhone() ? rules.search.maxSuggestionsPhone : rules.search.maxSuggestions;
      localFetch(`/api/suggest?q=${encodeURIComponent(q)}&max=${max}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: Suggestion[] }) => setLive({ for: q, items: d.items }))
        .catch(() => {});
    }, rules.search.debounceMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, typing]);

  // Full screen on phones: the page behind doesn't scroll.
  useEffect(() => {
    if (!overlay) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [overlay]);

  const lower = q.toLowerCase();
  const fits = (t: string) => t.toLowerCase() !== lower && suggestionMatch(t, typed) !== null;
  const recent: Option[] = suggestions
    ? recents
        .filter(fits)
        .slice(0, typing ? 2 : rules.search.recentShown)
        .map((term) => ({ kind: "recent", term }))
    : [];
  const seen = new Set(recent.map((o) => o.term.toLowerCase()));
  const toOption = (s: Suggestion): Option =>
    s.kind === "category" ? { kind: "category", term: s.text, cat: s.cat, name: s.name } : s.kind === "query" ? { kind: "query", term: s.text } : { kind: s.kind, term: s.text, href: s.href };
  const extra: Option[] = !suggestions
    ? []
    : typing
      ? live.for === q
        ? live.items.map(toOption).filter((o) => o.kind !== "query" || !seen.has(o.term.toLowerCase()))
        : []
      : trending
          .filter((t) => fits(t) && !seen.has(t.toLowerCase()))
          .slice(0, rules.search.trendingShown)
          .map((term) => ({ kind: "trending", term }));
  const options = [...recent, ...extra];
  const expanded = open && options.length > 0;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const leaveOverlay = () => {
    setOverlay(false);
    close();
    inputRef.current?.blur();
  };
  const fieldText = (o: Option) => (isLink(o) ? typed : o.term);
  const highlight = (i: number) => {
    setActive(i);
    setValue(i >= 0 ? fieldText(options[i]) : typed);
  };
  const choose = (o: Option) => {
    if (isLink(o)) {
      close();
      setOverlay(false);
      router.push(o.href);
      return;
    }
    flushSync(() => {
      setTyped(o.term);
      setValue(o.term);
      if (o.kind === "category") setScope(o.cat);
    });
    close();
    setOverlay(false);
    formRef.current?.requestSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length === 0) return;
      if (!expanded) setOpen(true);
      // -1 is the typed text; moving past either end comes back to it.
      const step = e.key === "ArrowDown" ? 1 : -1;
      highlight(((active + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (e.key === "Escape") {
      // Never let Escape wipe the field (the native search input clears on Escape).
      e.preventDefault();
      if (expanded) {
        setValue(typed);
        close();
      } else if (overlay) leaveOverlay();
    } else if (e.key === "Enter" && expanded && active >= 0 && (isLink(options[active]) || options[active].kind === "category" || value !== options[active].term)) {
      // A row that opens a page or changes the scope, or one highlighted with the pointer.
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Delete" && e.shiftKey && expanded && active >= 0 && options[active].kind === "recent") {
      e.preventDefault();
      removeRecentSearch(options[active].term);
      setValue(typed);
      setActive(-1);
    } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) && active >= 0) {
      // Editing the highlighted suggestion makes it what the buyer typed.
      setTyped(value);
      setActive(-1);
    }
  };

  const clear = () => {
    setTyped("");
    setValue("");
    setActive(-1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      close();
      setOverlay(false);
    }
  };

  const optionId = (i: number) => `${id}-opt-${i}`;
  const rows = GROUPS.map((g) => ({ ...g, items: options.map((o, i) => ({ o, i })).filter(({ o }) => g.kinds.includes(o.kind)) })).filter((g) => g.items.length > 0);

  return (
    <Form
      ref={formRef}
      action="/search"
      role="search"
      aria-label="Search WorldStore"
      className={cx("ws-search", overlay && "ws-search--overlay")}
      onSubmit={() => {
        if (suggestions) addRecentSearch(value);
        close();
        setOverlay(false);
        inputRef.current?.blur();
      }}
      onBlur={onBlur}
    >
      <div className="ws-search__field">
        {scopes && scopes.length > 0 && (
          <span className="ws-search__scope">
            <select aria-label="Search in" value={scope} onChange={(e) => setScope(e.target.value)} name={scope ? "cat" : undefined}>
              <option value="">All categories</option>
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ArrowDownIcon />
          </span>
        )}
        <MagnifyingGlassIcon className="ws-search__icon" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(e) => {
            setTyped(e.target.value);
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setOpen(true);
            if (isPhone()) setOverlay(true);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label="Search for anything"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 && active < options.length ? optionId(active) : undefined}
          placeholder="Search for anything"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={200}
          className="ws-search__input"
        />
        {value && (
          <button type="button" className="ws-search__clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={clear}>
            <XmarkCircleIcon />
          </button>
        )}
        {Object.entries(keep).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button ref={submitRef} type="submit" className={buttonClass({ size: "sm", className: "ws-search__submit" })}>
          Search
        </button>
      </div>
      {overlay && (
        <button
          type="button"
          className="ws-search__cancel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue(defaultValue);
            setTyped(defaultValue);
            leaveOverlay();
          }}
        >
          Cancel
        </button>
      )}
      {/* Opens from the field with a spring; rows stagger in. */}
      <AnimatePresence>
        {expanded && (
          <m.div
            key="panel"
            className="ws-suggest"
            style={{ transformOrigin: "top center" }}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={spring.snappy}
          >
            <ul id={listId} role="listbox" aria-label="Search suggestions">
              {rows.map((g) => (
                <li key={g.label} role="presentation" className="ws-suggest__group">
                  <div className="ws-suggest__head" id={`${id}-${g.kinds[0]}`} role="presentation">
                    {g.label}
                  </div>
                  <ul role="group" aria-labelledby={`${id}-${g.kinds[0]}`}>
                    {g.items.map(({ o, i }) => {
                      const Icon = ICONS[o.kind];
                      return (
                        <m.li
                          key={`${o.kind}:${o.term}:${"cat" in o ? o.cat : ""}`}
                          id={optionId(i)}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...spring.soft, delay: i * 0.025 }}
                          role="option"
                          aria-selected={i === active}
                          className="ws-suggest__option"
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseMove={() => i !== active && setActive(i)}
                          onClick={() => choose(o)}
                        >
                          <Icon />
                          <span className="ws-suggest__text">
                            <SuggestionText text={o.term} typed={typed} />
                            {o.kind === "category" && (
                              <>
                                {" "}
                                in <span className="ws-suggest__in">{o.name}</span>
                              </>
                            )}
                          </span>
                          {o.kind === "recent" && (
                            // Pointer shortcut; keyboard users have Shift+Delete.
                            <span
                              className="ws-suggest__remove"
                              aria-hidden="true"
                              title="Remove from recent searches"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentSearch(o.term);
                                setActive(-1);
                              }}
                            >
                              <XmarkCircleIcon />
                            </span>
                          )}
                        </m.li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
            {recent.length > 0 && !typing && (
              <button type="button" className="ws-suggest__clear" onMouseDown={(e) => e.preventDefault()} onClick={clearRecentSearches}>
                Clear recent searches
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </Form>
  );
}
