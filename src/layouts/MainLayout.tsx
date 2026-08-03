import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ToastContainer from '@/components/ui/ToastContainer';
import MobileMenu from '@/components/layout/MobileMenu';
import VoiceButton from '@/components/common/VoiceButton';

/**
 * `ws` scopes the design-system typography and token colors. It is applied here
 * rather than globally so the un-migrated vendor and admin layouts keep their
 * own styling until they move across.
 */
export default function MainLayout() {
  return (
    <div className="ws ws-shell">
      <Header />
      <main className="ws-shell__main">
        <Outlet />
      </main>
      <Footer />

      {/* Overlay Components */}
      <MobileMenu />
      <ToastContainer />
      <VoiceButton />
    </div>
  );
}
