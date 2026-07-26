import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
      icon: 'forum',
      title: 'My Messages',
      description: 'Conversations with sellers'
    },
    {
      path: '/account/profile',
      icon: 'person',
      title: 'Profile',
      description: 'Update your information'
    },
  ];

  // Seller CTA — driven by whether they have a store, not a legacy flag.
  const vendorItem = store
    ? {
        path: '/vendor',
        icon: 'storefront',
        title: 'Store Dashboard',
        description: store.isPubliclyVisible
          ? `Manage ${store.name}`
          : `${store.name} — not visible to buyers yet`,
      }
    : {
        path: '/vendor/register',
        icon: 'add_business',
        title: 'Open a Store',
        description: 'List your products and reach buyers on WorldStreet',
      };

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-header">
          <h1>My Account</h1>
          <p>Welcome back, {user?.firstName}!</p>
        </div>

        <div className="account-grid">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path} className="account-card">
              <span className="material-icons">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Link>
          ))}
          <Link to={vendorItem.path} className="account-card vendor-cta">
            <span className="material-icons">{vendorItem.icon}</span>
            <h3>{vendorItem.title}</h3>
            <p>{vendorItem.description}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
