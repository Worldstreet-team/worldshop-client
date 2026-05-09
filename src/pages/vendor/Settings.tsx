import { useState, useEffect, useCallback } from 'react';
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
  const [savingAccount, setSavingAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountVerified, setAccountVerified] = useState(false);

  const fullStoreUrl = user?.storeSlug
    ? `https://shop.worldstreetgold.com/store/${user.storeSlug}`
    : '';

  const handleCopyUrl = useCallback(() => {
    if (!fullStoreUrl) return;
    navigator.clipboard.writeText(fullStoreUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fullStoreUrl]);

  useEffect(() => {
    Promise.all([
      vendorService.getProfile(),
      vendorService.getWithdrawalAccount(),
    ])
      .then(([res, accountRes]) => {
        const profile = res.data;
        setStoreName(profile.storeName || '');
        setStoreDescription(profile.storeDescription || '');
        const account = accountRes.data;
        if (account) {
          setBankName(account.bankName);
          setAccountNumber(account.accountNumber);
          setAccountName(account.accountName);
          setAccountVerified(account.isVerified);
        }
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
      await syncClerkUser(true);
      addToast({ type: 'success', message: 'Store settings updated.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await vendorService.updateWithdrawalAccount({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      });
      setAccountVerified(res.data.isVerified);
      addToast({ type: 'success', message: 'Withdrawal account verified and saved.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save withdrawal account' });
    } finally {
      setSavingAccount(false);
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
              <div className="store-url-preview" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="url-full" style={{ wordBreak: 'break-all' }}>{fullStoreUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  style={{
                    flexShrink: 0,
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: copied ? '#d4edda' : '#f8f9fa',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '1rem' }}>{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
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

      <form className="settings-form" onSubmit={handleWithdrawalSubmit}>
        <section className="form-section">
          <h2>Withdrawal Account</h2>
          <p className="text-muted">The account name must match your profile name: {user?.firstName} {user?.lastName}.</p>

          <div className="form-group">
            <label htmlFor="bankName">Bank Name *</label>
            <input
              id="bankName"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number *</label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Account number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="accountName">Account Name *</label>
            <input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                setAccountVerified(false);
              }}
              placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
              required
            />
          </div>

          {accountVerified && (
            <div className="form-group">
              <span className="badge badge-success">Verified</span>
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={savingAccount}>
            {savingAccount ? 'Saving...' : 'Save Withdrawal Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
