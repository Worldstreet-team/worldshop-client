import { useAuthStore } from '@/store/authStore';

export default function VendorDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.storeName}</h1>
        <p>Manage your store and products from here.</p>
      </div>

      <div className="dashboard-placeholder">
        <span className="material-icons">construction</span>
        <h3>Dashboard Coming Soon</h3>
        <p>Product management, order tracking, and analytics will appear here.</p>
      </div>
    </div>
  );
}
