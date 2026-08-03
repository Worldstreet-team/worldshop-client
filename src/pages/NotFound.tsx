import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * 404. The recovery paths a lost visitor actually uses, in order: search for
 * what they wanted, or jump back into browsing. The dead URL is shown so a
 * mistyped link is diagnosable at a glance.
 */
export default function NotFoundPage() {
  usePageTitle('Page not found');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <div className="ws-wrap">
      <div className="ws-404">
        <p className="ws-404__code ws-num" aria-hidden>404</p>
        <h1 className="ws-h1">This page does not exist</h1>
        <p className="ws-404__copy">
          <code className="ws-404__path">{window.location.pathname}</code> did not match
          anything — the link may be old, or mistyped.
        </p>

        <form
          className="ws-search ws-404__search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = query.trim();
            navigate(q ? `/listings?search=${encodeURIComponent(q)}` : '/listings');
          }}
        >
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the marketplace instead…"
            aria-label="Search the marketplace"
          />
        </form>

        <div className="ws-404__links">
          <Link to="/" className="ws-btn ws-btn--secondary">Go home</Link>
          <Link to="/listings" className="ws-btn ws-btn--primary">Browse listings</Link>
        </div>
      </div>
    </div>
  );
}
