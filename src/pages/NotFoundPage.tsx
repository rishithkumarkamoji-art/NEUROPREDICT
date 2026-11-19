import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function NotFoundPage() {
  const { user } = useAuth();
  const home = user
    ? user.role === 'admin'
      ? '/admin'
      : user.role === 'faculty'
      ? '/faculty'
      : '/student'
    : '/';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">404</p>
      <h1 className="mt-2 text-3xl font-display font-bold text-slate-900 dark:text-slate-50">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
        The NeuroPredict route you requested does not exist or requires a different access role.
      </p>
      <Link
        to={home}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to {user ? 'Dashboard' : 'Home'}</span>
      </Link>
    </div>
  );
}
