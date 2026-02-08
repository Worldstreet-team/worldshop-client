import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Load auth dev utilities in development mode
if (import.meta.env.DEV) {
  import('./utils/authDevUtils');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
