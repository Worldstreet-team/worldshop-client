import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import LocationSelect from '@/app/layouts/components/LocationSelect';

export default function MarketplaceSearch({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlSearch = params.get('search') ?? '';
  const [searchBox, setSearchBox] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchBox(urlSearch);
  }
  const activeCountry = params.get('country') ?? '';
  const activeState = params.get('state') ?? '';
  const onBrowse = location.pathname === '/' || location.pathname.startsWith('/listings');
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchBox.trim();
    navigate(q ? `/listings?search=${encodeURIComponent(q)}` : '/listings');
  };

  const setLocation = (country: string, state: string) => {
    const next = new URLSearchParams(onBrowse ? params : undefined);
    if (country) next.set('country', country); else next.delete('country');
    if (state) next.set('state', state); else next.delete('state');
    next.delete('page');
    navigate(`/listings?${next.toString()}`);
  };

  return (
    <form
      className={`ws-search ws-marketsearch${className ? ` ${className}` : ''}`}
      onSubmit={submitSearch}
      role="search"
    >
      <Search size={18} aria-hidden />
      <input
        type="search"
        value={searchBox}
        onChange={(e) => setSearchBox(e.target.value)}
        placeholder="Search phones, cars, furniture…"
        aria-label="Search the marketplace"
      />
      <div className="ws-marketsearch__location">
        <LocationSelect country={activeCountry} state={activeState} onChange={setLocation} />
      </div>
      <button type="submit" className="ws-btn ws-btn--primary ws-marketsearch__go">
        Search
      </button>
    </form>
  );
}
