import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type CommissionReport, type CommissionSetting } from '@/services/adminService';
import { useUIStore } from '@/store/uiStore';

const formatPrice = (price: number) =>
  '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

export default function AdminCommission() {
  const addToast = useUIStore((s) => s.addToast);

  const [report, setReport] = useState<CommissionReport | null>(null);
  const [setting, setSetting] = useState<CommissionSetting | null>(null);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [reportData, settingData] = await Promise.all([
          adminService.getCommissionReport(),
          adminService.getCommissionRate(),
        ]);
        setReport(reportData);
        setSetting(settingData);
        setNewRate(String((settingData.value * 100).toFixed(1)));
      } catch (err: any) {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load commission data' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      addToast({ type: 'error', message: 'Rate must be between 0% and 100%.' });
      return;
    }

    setSaving(true);
    try {
      const result = await adminService.updateCommissionRate(rate);
      setSetting(result);
      addToast({ type: 'success', message: `Commission rate updated to ${(rate * 100).toFixed(1)}%.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update rate' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-commission">
        <div className="page-header">
          <Link to="/admin/vendors" className="back-link">
            <span className="material-icons">arrow_back</span> Back to Vendors
          </Link>
          <h1>Commission Settings</h1>
        </div>
        <div className="skeleton-row" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div className="admin-commission">
      <div className="page-header">
        <Link to="/admin/vendors" className="back-link">
          <span className="material-icons">arrow_back</span> Back to Vendors
        </Link>
        <h1>Commission Settings & Report</h1>
      </div>

      {/* Commission Rate Setting */}
      <section className="detail-section">
        <h2>Commission Rate</h2>
        <p className="text-muted">
          The platform commission rate applied to all vendor sales. Changes affect future orders only.
        </p>
        <form onSubmit={handleUpdateRate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="rate">Rate (%)</label>
            <input
              id="rate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              style={{ width: 120 }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Update Rate'}
          </button>
          {setting && (
            <span className="text-muted">
              Current: {(setting.value * 100).toFixed(1)}%
            </span>
          )}
        </form>
      </section>

      {/* Platform Summary */}
      {report && (
        <>
          <section className="detail-section">
            <h2>Platform Summary</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value">{report.platform.totalOrders}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Total Sales</span>
                  <span className="stat-value">{formatPrice(report.platform.totalSales)}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Commission Earned</span>
                  <span className="stat-value">{formatPrice(report.platform.totalCommission)}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Net to Vendors</span>
                  <span className="stat-value">{formatPrice(report.platform.netToVendors)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Vendor Breakdown */}
          {report.vendors.length > 0 && (
            <section className="detail-section">
              <h2>Vendor Breakdown</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Orders</th>
                      <th>Total Sales</th>
                      <th>Commission</th>
                      <th>Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.vendors.map((v) => (
                      <tr key={v.vendorId}>
                        <td><strong>{v.vendorName}</strong></td>
                        <td>{v.totalOrders}</td>
                        <td>{formatPrice(v.totalSales)}</td>
                        <td>{formatPrice(v.totalCommission)}</td>
                        <td><strong>{formatPrice(v.netRevenue)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
