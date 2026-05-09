import { useCallback, useEffect, useState } from 'react';
import {
  adminService,
  type AdminWithdrawalRequest,
  type WithdrawalRequestStatus,
} from '@/services/adminService';
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

const statusOptions: Array<WithdrawalRequestStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'];

export default function AdminWithdrawals() {
  const addToast = useUIStore((s) => s.addToast);
  const [requests, setRequests] = useState<AdminWithdrawalRequest[]>([]);
  const [status, setStatus] = useState<WithdrawalRequestStatus | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getWithdrawalRequests({
        limit: 50,
        ...(status !== 'ALL' ? { status } : {}),
      });
      setRequests(res.data);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load withdrawals' });
    } finally {
      setLoading(false);
    }
  }, [addToast, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (
    request: AdminWithdrawalRequest,
    nextStatus: Exclude<WithdrawalRequestStatus, 'PENDING'>,
  ) => {
    const note = window.prompt(
      nextStatus === 'PAID'
        ? 'Optional transfer reference or admin note'
        : 'Optional admin note',
      request.adminNote || '',
    );

    if (note === null) return;

    setUpdatingId(request.id);
    try {
      await adminService.updateWithdrawalStatus(request.id, nextStatus, note.trim() || undefined);
      addToast({ type: 'success', message: `Withdrawal marked as ${nextStatus}.` });
      await load();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update withdrawal' });
    } finally {
      setUpdatingId(null);
    }
  };

  const canReview = (request: AdminWithdrawalRequest) => request.status === 'PENDING';
  const canPay = (request: AdminWithdrawalRequest) => request.status === 'PENDING' || request.status === 'APPROVED';

  return (
    <div className="admin-withdrawals">
      <div className="page-header">
        <h1>Withdrawals</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as WithdrawalRequestStatus | 'ALL')}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <section className="dashboard-section">
        <h2>Manual Disbursement Queue</h2>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Bank Details</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading withdrawal requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7}>No withdrawal requests found.</td>
                </tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>
                    <strong>{request.vendor?.storeName || 'Unknown Store'}</strong>
                    <br />
                    <span className="text-muted">{request.vendor?.email || request.vendorId}</span>
                  </td>
                  <td>{formatMoney(request.amount)}</td>
                  <td>
                    <strong>{request.bankName}</strong>
                    <br />
                    {request.accountNumber} - {request.accountName}
                  </td>
                  <td><span className={`badge badge-${request.status.toLowerCase()}`}>{request.status}</span></td>
                  <td>
                    {request.vendorNote && <div>Vendor: {request.vendorNote}</div>}
                    {request.adminNote && <div>Admin: {request.adminNote}</div>}
                    {!request.vendorNote && !request.adminNote && '-'}
                  </td>
                  <td>
                    <div className="table-actions">
                      {canReview(request) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={updatingId === request.id}
                          onClick={() => updateStatus(request, 'APPROVED')}
                        >
                          Approve
                        </button>
                      )}
                      {canPay(request) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={updatingId === request.id}
                          onClick={() => updateStatus(request, 'PAID')}
                        >
                          Mark Paid
                        </button>
                      )}
                      {canPay(request) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={updatingId === request.id}
                          onClick={() => updateStatus(request, 'REJECTED')}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
