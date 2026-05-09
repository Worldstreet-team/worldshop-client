import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  vendorService,
  type VendorBalanceSummary,
  type WithdrawalAccount,
  type WithdrawalRequest,
} from '@/services/vendorService';
import { useUIStore } from '@/store/uiStore';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function VendorWithdrawals() {
  const addToast = useUIStore((s) => s.addToast);
  const [account, setAccount] = useState<WithdrawalAccount | null>(null);
  const [balance, setBalance] = useState<VendorBalanceSummary | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [vendorNote, setVendorNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountRes, balanceRes, requestsRes] = await Promise.all([
        vendorService.getWithdrawalAccount(),
        vendorService.getBalance(),
        vendorService.getWithdrawalRequests({ limit: 20 }),
      ]);
      setAccount(accountRes.data);
      setBalance(balanceRes.data);
      setRequests(requestsRes.data);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load withdrawals' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (!account) {
      addToast({ type: 'error', message: 'Add a withdrawal account first.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      addToast({ type: 'error', message: 'Enter a valid withdrawal amount.' });
      return;
    }

    if (balance && numericAmount > balance.availableBalance) {
      addToast({ type: 'error', message: 'Withdrawal amount exceeds your available balance.' });
      return;
    }

    setSubmitting(true);
    try {
      await vendorService.createWithdrawalRequest({
        amount: numericAmount,
        accountId: account.id,
        vendorNote: vendorNote.trim() || undefined,
      });
      setAmount('');
      setVendorNote('');
      addToast({ type: 'success', message: 'Withdrawal request submitted for admin review.' });
      await load();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to submit withdrawal request' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="vendor-withdrawals">
        <div className="page-header"><h1>Withdrawals</h1></div>
        <div className="skeleton-row" style={{ height: 220 }} />
      </div>
    );
  }

  return (
    <div className="vendor-withdrawals">
      <div className="page-header">
        <h1>Withdrawals</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">account_balance_wallet</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Available Balance</span>
            <span className="stat-value">{formatMoney(balance?.availableBalance ?? 0)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">payments</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending Requests</span>
            <span className="stat-value">{requests.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED').length}</span>
          </div>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Request Withdrawal</h2>
          {account ? (
            <div className="dashboard-info-bar">
              <span className="material-icons">account_balance</span>
              <span>{account.bankName} - {account.accountNumber} - {account.accountName}</span>
            </div>
          ) : (
            <div className="dashboard-info-bar">
              <span className="material-icons">info</span>
              <span>Add and verify a withdrawal account in <Link to="/vendor/settings">Store Settings</Link> before requesting funds.</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="withdrawalAmount">Amount *</label>
            <input
              id="withdrawalAmount"
              type="number"
              min="1"
              max={balance?.availableBalance ?? undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="vendorNote">Note</label>
            <textarea
              id="vendorNote"
              rows={3}
              value={vendorNote}
              onChange={(e) => setVendorNote(e.target.value)}
              placeholder="Optional note for the admin"
            />
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || !account || (balance?.availableBalance ?? 0) <= 0}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      <section className="dashboard-section">
        <h2>Request History</h2>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Status</th>
                <th>Admin Note</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5}>No withdrawal requests yet.</td>
                </tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{formatMoney(request.amount)}</td>
                  <td>{request.bankName} - {request.accountNumber}</td>
                  <td><span className={`badge badge-${request.status.toLowerCase()}`}>{request.status}</span></td>
                  <td>{request.adminNote || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
