import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const { isAuthenticated, redirectToRegister } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      redirectToRegister(window.location.origin);
    }
  }, [isAuthenticated, redirectToRegister]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      fontSize: '1.1rem',
      color: '#666',
    }}>
      Redirecting to register...
    </div>
  );
}
