import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { DEPARTMENTS } from '../../shared/academicRules';
import type { PublicUser, UserRole } from '../../shared/types';
import {
  ConfirmDialog,
  ErrorState,
  LoadingSkeleton,
  ModalDialog,
  SectionHeader,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { notify } = useThemeToast();

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PublicUser | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'faculty' as UserRole,
    department: DEPARTMENTS[0] as string,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users');
      setUsers(res.data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      notify('success', 'User account created', `${form.name} (${form.role}) added.`);
      setAddOpen(false);
      setForm({ name: '', email: '', password: '', role: 'faculty', department: DEPARTMENTS[0] });
      loadUsers();
    } catch (err) {
      notify('error', 'Failed to create user', err instanceof Error ? err.message : undefined);
    }
  };

  const handleRoleChange = async (target: PublicUser, nextRole: UserRole) => {
    try {
      await api.put(`/users/${target.id}`, { role: nextRole });
      notify('success', 'Role updated', `${target.name} is now ${nextRole}.`);
      loadUsers();
    } catch (err) {
      notify('error', 'Role update failed', err instanceof Error ? err.message : undefined);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      notify('success', 'User removed', `${deleteTarget.email} deleted.`);
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      notify('error', 'Delete failed', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User Management & Access Roles"
        description="Manage institutional Administrator, Faculty, and Student credentials secured with bcrypt password hashing."
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
        }
      />

      {loading && <LoadingSkeleton rows={4} />}
      {!loading && error && <ErrorState message={error} onRetry={loadUsers} />}

      {!loading && !error && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-medium">Name &amp; Email</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Created</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="text-xs font-mono text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {u.department || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Role for ${u.name}`}
                        disabled={u.id === currentUser?.id}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs capitalize disabled:opacity-60"
                      >
                        <option value="admin">Admin</option>
                        <option value="faculty">Faculty</option>
                        <option value="student">Student</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={u.id === currentUser?.id}
                        onClick={() => setDeleteTarget(u)}
                        aria-label={`Delete user ${u.name}`}
                        className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Institutional User"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label htmlFor="um-name" className="block text-xs font-medium mb-1">
              Full Name
            </label>
            <input
              id="um-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="um-email" className="block text-xs font-medium mb-1">
              Email
            </label>
            <input
              id="um-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="um-pass" className="block text-xs font-medium mb-1">
              Initial Password (min 6 chars)
            </label>
            <input
              id="um-pass"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="um-role" className="block text-xs font-medium mb-1">
                Role
              </label>
              <select
                id="um-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="admin">Administrator</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label htmlFor="um-dept" className="block text-xs font-medium mb-1">
                Department
              </label>
              <select
                id="um-dept"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Account
            </button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User Account"
        message={`Remove access for ${deleteTarget?.name} (${deleteTarget?.email})?`}
        confirmLabel="Delete User"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
