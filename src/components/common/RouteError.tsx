import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

/**
 * Route-level error fallback. Replaces react-router's raw "Unexpected
 * Application Error" screen. A failed dynamic import (a stale chunk after a
 * new deploy) is the common case here — `vite:preloadError` in main.tsx
 * reloads once automatically, and this is the friendly backstop if that guard
 * has already fired.
 */
export default function RouteError() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  const isChunkError =
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
      error.message,
    );

  return (
    // Carries `ws` itself: an error boundary can render outside MainLayout, so
    // it cannot rely on an ancestor to scope the token-driven typography.
    <div className="ws ws-page" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div className="ws-empty">
        <h1 className="ws-h2">
          {isChunkError ? 'A new version is available' : 'Something went wrong'}
        </h1>
        <p className="ws-body ws-muted" style={{ maxWidth: '44ch' }}>
          {isChunkError
            ? 'The store was updated while this tab was open. Reload to get the latest version.'
            : 'We hit an unexpected error. Reloading usually fixes it.'}
        </p>
        <button
          type="button"
          className="ws-btn ws-btn--primary ws-btn--sm"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
        {!isChunkError && <p className="ws-caption ws-subtle">{message}</p>}
      </div>
    </div>
  );
}
