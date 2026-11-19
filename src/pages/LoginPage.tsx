import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';

const DEMO_ACCOUNTS = [
  {
    role: 'Administrator',
    email: 'admin@neuropredict.edu',
    pass: 'Admin@123',
    summary: 'Full cohort analytics, student CRUD, CSV import, model retraining & settings',
    icon: ShieldCheck,
  },
  {
    role: 'Faculty',
    email: 'faculty@neuropredict.edu',
    pass: 'Faculty@123',
    summary: 'Assigned department records, inline marks/attendance updates & risk alerts',
    icon: BookOpen,
  },
  {
    role: 'Student',
    email: 'aarav.sharma@neuropredict.edu',
    pass: 'Student@123',
    summary: 'Personal dashboard for Aarav Sharma (NP2023001), predictions & action plans',
    icon: GraduationCap,
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const { notify } = useThemeToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setError('');
    if (!targetEmail.trim() || !targetPassword) {
      setError('Please enter both your email address and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(targetEmail.trim(), targetPassword);
      notify('success', `Welcome back, ${user.name}`);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Login Form */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50"
          >
            NeuroPredict
          </Link>
          <h1 className="mt-5 text-2xl font-display font-bold text-slate-900 dark:text-slate-50">
            Sign in to your workspace
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Role-based access for administrators, faculty advisors, and students.
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
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Institutional Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@neuropredict.edu"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm px-4 py-2.5 transition-colors"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
            Need a student or faculty account?{' '}
            <Link to="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Seeded Demo Accounts Panel */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Demo Accounts for PBL Evaluation
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select any seeded role below to authenticate with JWT and test role-based permissions.
            </p>

            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <div key={acc.role} className="py-4 first:pt-1 last:pb-1 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {acc.role}
                        </p>
                      </div>
                      <p className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {acc.email} / {acc.pass}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{acc.summary}</p>
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => performLogin(acc.email, acc.pass)}
                      className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
                    >
                      Sign in as {acc.role}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
