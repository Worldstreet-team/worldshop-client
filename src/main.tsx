import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables');
}

// After a new deploy the hashed chunk names change, so a tab still running the
// previous build can fail to fetch a lazy-loaded chunk (e.g. the Cart page) and
// crash with "Failed to fetch dynamically imported module". Vite fires
// `vite:preloadError` in that case — reload once to pull the fresh index/chunks.
// The sessionStorage guard (cleared on a clean load) prevents a reload loop if
// the fetch is failing for a real network reason rather than a stale deploy.
const RELOAD_GUARD_KEY = 'ws-chunk-reload';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem(RELOAD_GUARD_KEY)) {
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    window.location.reload();
  }
});
window.addEventListener('load', () => {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
    >
      <App />
    </ClerkProvider>
  </StrictMode>
);
