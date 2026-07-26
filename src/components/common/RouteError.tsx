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
    <div className="route-error">
      <div className="route-error-inner">
        <h1>{isChunkError ? 'A new version is available' : 'Something went wrong'}</h1>
        <p>
          {isChunkError
            ? 'The store was updated while this tab was open. Reload to get the latest version.'
            : "We hit an unexpected error. Reloading usually fixes it."}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
        {!isChunkError && <p className="route-error-detail">{message}</p>}
      </div>
    </div>
  );
}
