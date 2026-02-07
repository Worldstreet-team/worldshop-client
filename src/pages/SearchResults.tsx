import { useSearchParams } from 'react-router-dom';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="search-results-page">
      <div className="container">
        <div className="search-header">
          <h1>Search Results</h1>
          {query && <p>Showing results for: "{query}"</p>}
        </div>

        {!query ? (
          <div className="no-query">
            <p>Please enter a search term</p>
          </div>
        ) : (
          <div className="search-layout">
            <aside className="filters-sidebar">
              {/* Filters will be added here */}
            </aside>

            <main className="products-grid">
              {/* Search results will be added here */}
              <p>Search results coming soon...</p>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
