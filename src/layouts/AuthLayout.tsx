import { Outlet, Link } from 'react-router-dom';
import ToastContainer from '@/components/ui/ToastContainer';

export default function AuthLayout() {
  return (
    <div className="ws ws-auth">
      <div className="ws-auth__panel">
        <Link to="/" className="ws-brand" aria-label="WorldShop home">
          <span className="ws-brand__eyebrow">Worldstreet</span>
          <span className="ws-brand__word">shop<span className="ws-brand__dot">.</span></span>
        </Link>

        <div className="ws-card">
          <Outlet />
        </div>

        <p className="ws-caption ws-subtle">
          &copy; {new Date().getFullYear()} WorldStreet. All rights reserved.
        </p>
      </div>

      <ToastContainer />
    </div>
  );
}
