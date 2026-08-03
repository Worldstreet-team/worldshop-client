import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, User, Store, PlusCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { storeService, type MyStore } from '@/services/storeService';

export default function AccountPage() {
  const { user } = useAuthStore();

  // Owning a store is what makes someone a seller now — the profile's
  // `isVendor` flag is no longer set for anyone, so it cannot drive this CTA.
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

  const menuItems = [
    {
      path: '/account/messages',
      Icon: MessageCircle,
      title: 'My Messages',
      description: 'Conversations with sellers',
    },
    {
      path: '/account/profile',
      Icon: User,
      title: 'Profile',
      description: 'Update your information',
    },
  ];

  // Seller CTA — driven by whether they have a store, not a legacy flag.
  const vendorItem = store
    ? {
        path: '/vendor',
        Icon: Store,
        title: 'Store Dashboard',
        description: store.isPubliclyVisible
          ? `Manage ${store.name}`
          : `${store.name} — not visible to buyers yet`,
      }
    : {
        path: '/vendor/register',
        Icon: PlusCircle,
        title: 'Open a Store',
        description: 'List your products and reach buyers on WorldStreet',
      };

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">My Account</h1>
          <p className="ws-page__sub">Welcome back, {user?.firstName}!</p>
        </div>
      </div>

      <div className="ws-stats">
        {[...menuItems, vendorItem].map(({ path, Icon, title, description }) => (
          <Link key={path} to={path} className="ws-card ws-stack ws-plink">
            <span className="ws-iconchip">
              <Icon size={22} aria-hidden />
            </span>
            <h2 className="ws-title">{title}</h2>
            <p className="ws-caption ws-muted">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
