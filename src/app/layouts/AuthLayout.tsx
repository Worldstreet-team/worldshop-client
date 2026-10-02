import { Outlet, Link } from 'react-router-dom';
import ToastContainer from '@/shared/components/ui/ToastContainer';

export default function AuthLayout() {
  return (
    <div className="ws ws-auth">
      <div className="ws-auth__panel">
        <div className="ws-auth__card">
          {/* Inside the card, not floating above it: on its own the 26px header
              lockup was too small to anchor the page and read as detached.
              Every page under this layout is the admin's, hence the eyebrow. */}
          <Link to="/" className="ws-brand ws-auth__brand" aria-label="WorldStore home">
            <img src="/brand/wstore-mark.svg" alt="" className="ws-brand__mark" />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
              <span className="ws-brand__eyebrow">Admin console</span>
            </span>
          </Link>

          <Outlet />
        </div>

        <p className="ws-caption ws-subtle">
          &copy; {new Date().getFullYear()} WorldStore. All rights reserved.
        </p>
      </div>

      <ToastContainer />
    </div>
  );
}
