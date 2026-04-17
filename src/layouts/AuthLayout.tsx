import { Outlet, Link } from 'react-router-dom';
import ToastContainer from '@/components/ui/ToastContainer';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src="/images/logo-wordmark-dark.svg" alt="WorldStreet" height="40" />
          </Link>
        </div>
        
        <div className="auth-content">
          <Outlet />
        </div>
        
        <div className="auth-footer">
          <p>&copy; {new Date().getFullYear()} WorldStreet. All rights reserved.</p>
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
}
