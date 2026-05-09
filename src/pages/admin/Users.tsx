import { useCallback, useEffect, useState } from 'react';
import { adminService, type AdminUser, type AdminUserFilters } from '@/services/adminService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

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
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to load users' });
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
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to update role' });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>Users {pagination && <small>({pagination.total})</small>}</h1>
      </div>

      <div className="filters-bar">
        <form onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, page: 1 })); }} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search users..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="filter-select"
          value={filters.role || ''}
          onChange={(e) => setFilters((f) => ({ ...f, role: (e.target.value || undefined) as AdminUserFilters['role'], page: 1 }))}
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Vendor</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton-row" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="empty-row"><p>No users found.</p></td></tr>
            ) : users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.firstName} {user.lastName}</strong>
                  <small className="text-muted d-block">{user.email}</small>
                </td>
                <td><span className={`badge ${user.role === 'ADMIN' ? 'badge-success' : 'badge-default'}`}>{user.role}</span></td>
                <td>{user.isVendor ? `${user.storeName || 'Vendor'} (${user.vendorStatus || 'N/A'})` : '-'}</td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  {user.role === 'ADMIN' ? (
                    <button className="btn btn-secondary btn-sm" disabled={updatingId === user.id} onClick={() => updateRole(user, 'CUSTOMER')}>
                      Demote
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" disabled={updatingId === user.id} onClick={() => updateRole(user, 'ADMIN')}>
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
        <div className="pagination">
          <button disabled={!pagination.hasPrevPage} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}>Previous</button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={!pagination.hasNextPage} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}>Next</button>
        </div>
      )}
    </div>
  );
}
