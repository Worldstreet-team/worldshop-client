import { useEffect } from 'react';
import AppRouter from '@/router';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import '@/styles/main.scss';

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();

  useEffect(() => {
    // Check auth status on app load
    checkAuth();
    
    // Generate session ID for guest cart if not exists
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', crypto.randomUUID());
    }
  }, [checkAuth]);

  useEffect(() => {
    // Fetch cart on auth change
    fetchCart();
  }, [isAuthenticated, fetchCart]);

  return <AppRouter />;
}

export default App;
