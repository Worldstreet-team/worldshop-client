import { useId, type ReactNode } from 'react';
import { RotateCcw, X } from 'lucide-react';
import {
  CONDITION_LABEL,
  EXTRAS,
  PRICE_BANDS,
  RATINGS,
  activeCount,
  countWith,
  type CategoryFilterState,
  type CategoryRow,
  type PriceBand,
  type RatingFloor,
} from '@/features/catalog/categoryFilters';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ws-cfilters__sec">
      <h3 className="ws-cfilters__label">{title}</h3>
      <div className="ws-cfilters__body">{children}</div>
    </section>
  );
}

// A count that would leave nothing is dimmed rather than hidden, so the rows
// do not jump as other filters change.
const Count = ({ n }: { n: number }) => (
  <span className={`ws-cfilters__count${n ? '' : ' is-zero'}`}>{n.toLocaleString('en-NG')}</span>
);

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <span className="ws-cfcheck">
      <input
        id={id}
        type="checkbox"
        className="ws-cfcheck__box"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </span>
  );
}

type CategoryFiltersProps = {
  rows: CategoryRow[];
  value: CategoryFilterState;
  onChange: (patch: Partial<CategoryFilterState>) => void;
  onClear: () => void;
  /** The card and its "Filters" head; off inside the mobile sheet, which has its own. */
  chrome?: boolean;
};

export default function CategoryFilters({
  rows,
  value,
  onChange,
  onClear,
  chrome = true,
}: CategoryFiltersProps) {
  const active = activeCount(value);
  const radioName = useId();
  // Only conditions something here is actually in: "Refurbished (0)" on a
  // section of new furniture is a question nobody asked.
  const conditions = Object.keys(CONDITION_LABEL).filter((c) => rows.some((r) => r.condition === c));

  return (
    <div className={`ws-cfilters${chrome ? '' : ' ws-cfilters--bare'}`}>
      {chrome && (
        <div className="ws-cfilters__head">
          <h2 className="ws-cfilters__title">
            Filters
            {active > 0 && <span className="ws-cfilters__n">({active})</span>}
          </h2>
          {active > 0 && (
            <button type="button" className="ws-cxghost" onClick={onClear}>
              <RotateCcw size={14} aria-hidden />
              Clear all
            </button>
          )}
        </div>
      )}

      <Section title="Price">
        <div className="ws-cfilters__pills">
          {(Object.keys(PRICE_BANDS) as PriceBand[]).map((band) => {
            const on = value.price === band;
            return (
              <button
                key={band}
                type="button"
                aria-pressed={on}
                className={`ws-pill ws-cxpill${on ? ' is-on' : ''}`}
                onClick={() => onChange({ price: on ? null : band })}
              >
                {PRICE_BANDS[band].label}
                <span className="ws-cxpill__n">{countWith(rows, value, { price: band })}</span>
                {on && <X size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      </Section>

      {conditions.length > 0 && (
        <Section title="Condition">
          <div className="ws-cfilters__rows">
            {conditions.map((c) => (
              <div key={c} className="ws-cfilters__row">
                <Check
                  label={CONDITION_LABEL[c]}
                  checked={value.conditions.includes(c)}
                  onChange={(on) =>
                    onChange({
                      conditions: on
                        ? [...value.conditions, c]
                        : value.conditions.filter((x) => x !== c),
                    })
                  }
                />
                <Count n={countWith(rows, value, { conditions: [c] })} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Seller rating">
        <div className="ws-cfilters__rows" role="radiogroup" aria-label="Seller rating">
          {(Object.keys(RATINGS) as RatingFloor[])
            .sort((a, b) => RATINGS[b] - RATINGS[a])
            .map((r) => {
              const id = `${radioName}-${r}`;
              return (
                <div key={r} className="ws-cfilters__row">
                  <span className="ws-cfcheck">
                    <input
                      id={id}
                      type="radio"
                      name={radioName}
                      className="ws-cfcheck__box ws-cfcheck__box--radio"
                      checked={value.rating === r}
                      // Clicking the chosen floor again clears it, as the
                      // sandbox's does; a plain radio could never be unset.
                      onClick={() => value.rating === r && onChange({ rating: null })}
                      onChange={() => onChange({ rating: r })}
                    />
                    <label htmlFor={id} className="ws-cfrating">
                      <span aria-hidden className="ws-cfrating__stars">
                        {stars(Math.floor(RATINGS[r]))}
                      </span>
                      <span className="ws-cfrating__text">{r} and up</span>
                    </label>
                  </span>
                  <Count n={countWith(rows, value, { rating: r })} />
                </div>
              );
            })}
        </div>
        {value.rating && (
          <button
            type="button"
            className="ws-cxghost ws-cfilters__any"
            onClick={() => onChange({ rating: null })}
          >
            Any rating
          </button>
        )}
      </Section>

      <Section title="Listing">
        <div className="ws-cfilters__rows">
          {EXTRAS.map(([key, label]) => (
            <div key={key} className="ws-cfilters__row">
              <Check label={label} checked={value[key]} onChange={(on) => onChange({ [key]: on })} />
              <Count n={countWith(rows, value, { [key]: true })} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
