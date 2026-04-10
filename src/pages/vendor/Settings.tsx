import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { vendorService, type RegisterVendorRequest } from '@/services/vendorService';
import { useUIStore } from '@/store/uiStore';

export default function VendorSettings() {
  const { user, syncClerkUser } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [storeDescription, setStoreDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vendorService.getProfile()
      .then((res) => {
        const profile = res.data;
        setStoreName(profile.storeName || '');
        setStoreDescription(profile.storeDescription || '');
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load profile' });
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      addToast({ type: 'error', message: 'Store name is required.' });
      return;
    }

    setSaving(true);
    try {
      const data: Partial<RegisterVendorRequest> = {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim() || undefined,
      };
      await vendorService.updateProfile(data);
      await syncClerkUser();
      addToast({ type: 'success', message: 'Store settings updated.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vendor-settings">
        <div className="page-header"><h1>Store Settings</h1></div>
        <div className="skeleton-row" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div className="vendor-settings">
      <div className="page-header">
        <h1>Store Settings</h1>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Store Information</h2>

          <div className="form-group">
            <label htmlFor="storeName">Store Name *</label>
            <input
              id="storeName"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Your store name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="storeDescription">Store Description</label>
            <textarea
              id="storeDescription"
              rows={4}
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Tell customers about your store"
            />
          </div>

          {user?.storeSlug && (
            <div className="form-group">
              <label>Store URL</label>
              <div className="store-url-preview">
                <span className="url-prefix">/store/</span>
                <span className="url-slug">{user.storeSlug}</span>
              </div>
              <small className="text-muted">Your store slug is generated from your store name and cannot be changed directly.</small>
            </div>
          )}

          {user?.vendorStatus && (
            <div className="form-group">
              <label>Account Status</label>
              <span className={`badge badge-${user.vendorStatus === 'ACTIVE' ? 'success' : user.vendorStatus === 'SUSPENDED' ? 'warning' : 'danger'}`}>
                {user.vendorStatus}
              </span>
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
