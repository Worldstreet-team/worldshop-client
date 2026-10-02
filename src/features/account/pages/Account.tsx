import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronRight, MessagesSquare, PlusCircle, Store, User, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { storeService, type MyStore } from '@/features/stores/api';
import { savedListings } from '@/features/listings/savedListings';
import { useUnreadCount } from '@/features/chat/hooks/useUnreadCount';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

type Tile = { to: string; Icon: LucideIcon; title: string; detail: string };

/**
 * The account hub, in the marketplace's own parts: the category pages' head
 * and the /categories map's tiles. The sandbox has no account page, so these
 * are the nearest designed pieces rather than a port.
 */
export default function AccountPage() {
  usePageTitle('My account');
  const { user, isAuthenticated } = useAuthStore();
  const unread = useUnreadCount(isAuthenticated);
  const saved = useSyncExternalStore(savedListings.subscribe, savedListings.count);

  // Owning a store is what makes someone a seller now: the profile's
  // `isVendor` flag is no longer set for anyone, so it cannot drive this.
  const [store, setStore] = useState<MyStore | null>(null);
  useEffect(() => {
    let cancelled = false;
    storeService
      .getMyStore()
      .then((res) => {
        if (!cancelled) setStore(res.data);
      })
      .catch(() => {
        // 404 = no store yet, which is the common case.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles: Tile[] = [
    {
      to: '/account/messages',
      Icon: MessagesSquare,
      title: 'Messages',
      detail: unread > 0 ? `${unread} unread` : 'Your conversations with sellers',
    },
    {
      to: '/saved',
      Icon: Bookmark,
      title: 'Saved listings',
      detail: saved > 0 ? `${saved} saved on this device` : 'Nothing saved yet',
    },
    { to: '/account/profile', Icon: User, title: 'Profile', detail: 'Your name, phone and details' },
    store
      ? {
          to: '/vendor',
          Icon: Store,
          title: store.name,
          detail: store.isPubliclyVisible ? 'Manage your shop' : 'Not visible to buyers yet',
        }
      : {
          to: '/vendor/register',
          Icon: PlusCircle,
          title: 'Open a shop',
          detail: 'List what you sell and reach buyers',
        },
  ];

  return (
    <div className="ws-wrap ws-cx">
      <CategoryHead
        crumbs={[{ label: 'My account' }]}
        title={user?.firstName ? `Welcome back, ${user.firstName}` : 'My account'}
      >
        Your messages, saved listings and profile in one place.
      </CategoryHead>

      <ul className="ws-cxmap ws-acctmap">
        {tiles.map(({ to, Icon, title, detail }) => (
          <li key={to} className="ws-cxmap__cell">
            <Link to={to} className="ws-cxmap__dept">
              <span className="ws-cxmap__icon">
                <Icon size={18} aria-hidden />
              </span>
              <span className="ws-cxmap__text">
                <span className="ws-cxmap__name">
                  {title}
                  <ChevronRight size={16} aria-hidden className="ws-cxmap__chev" />
                </span>
                <span className="ws-cxmap__count">{detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
