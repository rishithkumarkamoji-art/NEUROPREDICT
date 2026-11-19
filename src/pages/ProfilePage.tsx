import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { DEPARTMENTS } from '../../shared/academicRules';
import { SectionHeader } from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { notify } = useThemeToast();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        name,
        department,
        ...(newPassword.length >= 6 ? { newPassword } : {}),
      });
      await refreshUser();
      setNewPassword('');
      notify('success', 'Profile updated');
    } catch (err) {
      notify('error', 'Update failed', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader
        title="Account Profile"
        description="Manage your personal display name, departmental affiliation, and password."
      />

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-slate-500">Email Address</p>
            <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
              {user?.email}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Assigned Role</p>
            <p className="mt-1 font-medium text-sm capitalize text-blue-700 dark:text-blue-400">
              {user?.role}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="prof-name" className="block text-xs font-medium mb-1">
            Full Name
          </label>
          <input
            id="prof-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="prof-dept" className="block text-xs font-medium mb-1">
            Department
          </label>
          <select
            id="prof-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="Academic Administration">Academic Administration</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prof-pass" className="block text-xs font-medium mb-1">
            New Password (leave blank to keep current)
          </label>
          <input
            id="prof-pass"
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Update Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
