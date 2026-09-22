import type { DirectoryFilters } from '@/shared/hooks/useDirectoryFilters';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';

type DirectoryHeroProps = {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  noun: string;
  filters: DirectoryFilters;
};

export default function DirectoryHero({ id, eyebrow, title, sub, noun, filters }: DirectoryHeroProps) {
  const { country, state, countryName, setCountry, setState } = filters;

  return (
    <section className="ws-browsehero" aria-labelledby={id}>
      <div className="ws-wrap">
        <div className="ws-browsehero__inner">
          <div>
            <span className="ws-hero__eyebrow">{eyebrow}</span>
            <h1 className="ws-browsehero__title" id={id}>
              {title}
            </h1>
            <p className="ws-browsehero__sub">{sub}</p>
          </div>

          <div className="ws-dirhero__filters" role="group" aria-label={`Filter ${noun} by location`}>
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
        </div>
      </div>
    </section>
  );
}
