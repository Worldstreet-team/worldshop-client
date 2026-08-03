import { Outlet, Link } from 'react-router-dom';
import ToastContainer from '@/components/ui/ToastContainer';

export default function AuthLayout() {
  return (
    <div className="ws ws-auth">
      <div className="ws-auth__panel">
        <Link to="/" className="ws-brand" aria-label="WorldStreet Shop home">
          {/* Unified ecosystem lockup (05-screens): gold wsa-mark 26px +
              "WorldStreet" Poppins SemiBold 15 + gold app eyebrow. */}
          <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
          <span className="ws-brand__stack">
            <span className="ws-brand__word">WorldStreet</span>
            <span className="ws-brand__eyebrow">Shop</span>
          </span>
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
