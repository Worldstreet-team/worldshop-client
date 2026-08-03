import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminService, type AdminUser, type AdminUserFilters } from '@/services/adminService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};


export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<AdminUserFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getUsers({ ...filters, search: search || undefined });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to load users') });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (user: AdminUser, role: 'CUSTOMER' | 'ADMIN') => {
    if (user.role === role) return;
    const action = role === 'ADMIN' ? 'promote' : 'demote';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    setUpdatingId(user.id);
    try {
      const updated = await adminService.updateUserRole(user.id, role);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      addToast({ type: 'success', message: `User role updated to ${role}.` });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to update role') });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">
          Users {pagination && <span className="ws-muted ws-num" style={{ fontWeight: 400 }}>({pagination.total})</span>}
        </h1>
      </div>

      <div
        style={{
          display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: 'var(--ws-space-4)',
        }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, page: 1 })); }}
          role="search"
        >
          <div className="ws-search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>
        </form>
        <select
          className="ws-select"
          style={{ width: 'auto', height: 44 }}
          aria-label="Filter by role"
          value={filters.role || ''}
          onChange={(e) => setFilters((f) => ({ ...f, role: (e.target.value || undefined) as AdminUserFilters['role'], page: 1 }))}
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      <div className="ws-card ws-card--flush ws-table-wrap">
        <table className="ws-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Vendor</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}><div className="ws-skeleton" style={{ height: 20 }} /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <p className="ws-body ws-muted" style={{ textAlign: 'center', padding: 'var(--ws-space-6)' }}>
                    No users found.
                  </p>
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</div>
                  <div className="ws-caption ws-muted">{user.email}</div>
                </td>
                <td>
                  <span className={`ws-badge ${user.role === 'ADMIN' ? 'ws-badge--brand' : 'ws-badge--neutral'}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.isVendor ? `${user.storeName || 'Vendor'} (${user.vendorStatus || 'N/A'})` : '—'}</td>
                <td className="ws-num">{formatDate(user.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  {user.role === 'ADMIN' ? (
                    <button
                      className="ws-btn ws-btn--sm ws-btn--secondary"
                      disabled={updatingId === user.id}
                      onClick={() => updateRole(user, 'CUSTOMER')}
                    >
                      Demote
                    </button>
                  ) : (
                    <button
                      className="ws-btn ws-btn--sm ws-btn--primary"
                      disabled={updatingId === user.id}
                      onClick={() => updateRole(user, 'ADMIN')}
                    >
                      Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="ws-pager">
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={!pagination.hasPrevPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
          >
            Previous
          </button>
          <span className="ws-pager__status ws-num">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={!pagination.hasNextPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
