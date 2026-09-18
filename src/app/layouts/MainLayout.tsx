import { Outlet, ScrollRestoration } from 'react-router-dom';
import Header from '@/app/layouts/components/Header';
import Footer from '@/app/layouts/components/Footer';
import ToastContainer from '@/shared/components/ui/ToastContainer';
import MobileMenu from '@/app/layouts/components/MobileMenu';
import VoiceButton from '@/features/voice/components/VoiceButton';

/**
 * `ws` scopes the design-system typography and token colors. It is applied here
 * rather than globally so the un-migrated vendor and admin layouts keep their
 * own styling until they move across.
 */
export default function MainLayout() {
  return (
    <div className="ws ws-shell">
      {/* First tab stop: past the search bar and category rail. */}
      <a href="#main" className="ws-skip">Skip to content</a>
      <Header />
      <main id="main" className="ws-shell__main">
        <Outlet />
      </main>
      <Footer />

      {/* Back/forward restores scroll; new locations start at the top. */}
      <ScrollRestoration />

      {/* Overlay Components */}
      <MobileMenu />
      <ToastContainer />
      <VoiceButton />
    </div>
  );
}
