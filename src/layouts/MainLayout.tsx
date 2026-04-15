import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/cart/CartSidebar';
import ToastContainer from '@/components/ui/ToastContainer';
import MobileMenu from '@/components/layout/MobileMenu';
import VoiceButton from '@/components/common/VoiceButton';

export default function MainLayout() {
  return (
    <div className="main-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      
      {/* Overlay Components */}
      <CartSidebar />
      <MobileMenu />
      <ToastContainer />
      <VoiceButton />
    </div>
  );
}
