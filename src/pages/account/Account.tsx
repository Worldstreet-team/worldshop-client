import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AccountPage() {
  const { user } = useAuthStore();

  const menuItems = [
    {
      path: '/account/orders',
      icon: 'shopping_bag',
      title: 'My Orders',
      description: 'View your order history'
    },
    {
      path: '/account/addresses',
      icon: 'location_on',
      title: 'Addresses',
      description: 'Manage delivery addresses'
    },
    {
      path: '/account/wishlist',
      icon: 'favorite',
      title: 'Wishlist',
      description: 'Products you saved'
    },
    {
      path: '/account/downloads',
      icon: 'cloud_download',
      title: 'Downloads',
      description: 'Your digital purchases'
    },
    {
      path: '/account/profile',
      icon: 'person',
      title: 'Profile',
      description: 'Update your information'
    },
  ];

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
        </div>
      </div>
    </div>
  );
}
