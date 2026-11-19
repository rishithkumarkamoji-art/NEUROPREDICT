import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEPARTMENTS } from '../../shared/academicRules';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { notify } = useThemeToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid institutional email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department,
      });
      notify('success', 'Account created', `Signed in as ${user.name}`);
      navigate(user.role === 'faculty' ? '/faculty' : '/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50"
        >
          NeuroPredict
        </Link>
        <h1 className="mt-5 text-2xl font-display font-bold text-slate-900 dark:text-slate-50">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Register as a student or faculty member to access predictions and analytics.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="reg-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anjali Deshpande"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@neuropredict.edu"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="reg-role"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Account Role
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'student' | 'faculty')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reg-dept"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Department
              </label>
              <select
                id="reg-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 transition-colors"
          >
            {submitting ? 'Creating account...' : 'Register Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
