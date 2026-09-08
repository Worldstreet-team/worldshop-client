import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminService, type AdminUser, type AdminUserFilters } from '@/services/adminService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';
import { RowMenu, type RowMenuItem } from '@/components/common';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

/** "in 6h" for an invite deadline. Mirrors the timeAgo in chat/Inbox, other way round. */
function timeUntil(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'any moment';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// The system has four badge tones; the three invite states take three of them.
const ADMIN_STATUS: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: 'ws-badge--success', label: 'Active' },
  AWAITING_SETUP: { cls: 'ws-badge--warning', label: 'Awaiting setup' },
  INVITE_EXPIRED: { cls: 'ws-badge--danger', label: 'Invite expired' },
};

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  // Debounced, not live per keystroke — otherwise a fast typist fires one
  // request per letter, and an earlier (shorter) query's response can land
  // after a later, more specific one and overwrite it with stale results.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setFilters((f) => (f.page === 1 ? f : { ...f, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getUsers({ ...filters, search: debouncedSearch || undefined });
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to load users') });
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (user: AdminUser, role: 'CUSTOMER' | 'ADMIN', confirmText?: string) => {
    if (user.role === role) return;
    const action = role === 'ADMIN' ? 'promote' : 'demote';
    if (!confirm(confirmText ?? `Are you sure you want to ${action} ${user.email}?`)) return;

    setUpdatingId(user.id);
    try {
      const updated = await adminService.updateUserRole(user.id, role);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));

      // A new admin can only sign in once they've set a password from the
      // emailed link, so a failed send is worth flagging rather than burying.
      if (updated.setupEmailSent === false) {
        addToast({
          type: 'error',
          message: `Promoted, but the password setup email to ${user.email} failed to send. They can request a link from the admin sign-in page.`,
        });
      } else {
        addToast({ type: 'success', message: `User role updated to ${role}.` });
      }
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to update role') });
    } finally {
      setUpdatingId(null);
    }
  };

  const resendInvite = async (user: AdminUser) => {
    setUpdatingId(user.id);
    try {
      const { expiresAt } = await adminService.resendAdminSetup(user.id);
      setUsers((current) => current.map((item) => item.id === user.id
        ? { ...item, adminStatus: 'AWAITING_SETUP', inviteExpiresAt: expiresAt }
        : item));
      addToast({ type: 'success', message: `Setup link sent to ${user.email}.` });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to send the setup link') });
    } finally {
      setUpdatingId(null);
    }
  };

  /** What you can do to a row depends on whether the admin ever set a password. */
  const menuItems = (user: AdminUser): RowMenuItem[] => {
    if (user.role !== 'ADMIN') {
      return [{ label: 'Make admin', onSelect: () => updateRole(user, 'ADMIN') }];
    }

    if (user.adminStatus === 'ACTIVE') {
      return [{ label: 'Remove admin', danger: true, onSelect: () => updateRole(user, 'CUSTOMER') }];
    }

    // Still waiting on them. Cancelling undoes the promotion outright, which
    // also kills the outstanding link — leaving them an admin who cannot sign
    // in would be a worse state than not being one.
    return [
      { label: 'Resend invite', onSelect: () => resendInvite(user) },
      {
        label: 'Cancel invite',
        danger: true,
        onSelect: () => updateRole(
          user,
          'CUSTOMER',
          `Cancel the admin invite for ${user.email}? Their setup link stops working and they go back to being a customer.`,
        ),
      },
    ];
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
              <th>Status</th>
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
                <td>
                  {user.adminStatus ? (
                    <>
                      <span className={`ws-badge ${ADMIN_STATUS[user.adminStatus]?.cls ?? 'ws-badge--neutral'}`}>
                        {ADMIN_STATUS[user.adminStatus]?.label ?? user.adminStatus}
                      </span>
                      {user.adminStatus === 'AWAITING_SETUP' && user.inviteExpiresAt && (
                        <div className="ws-caption ws-muted" style={{ marginTop: 2 }}>
                          link expires in {timeUntil(user.inviteExpiresAt)}
                        </div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="ws-num">{formatDate(user.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <RowMenu
                    items={menuItems(user)}
                    disabled={updatingId === user.id}
                    label={`Actions for ${user.email}`}
                  />
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
