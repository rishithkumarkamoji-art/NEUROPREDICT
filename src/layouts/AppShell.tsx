import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Sparkles,
  History,
  Network,
  Cpu,
  BarChart3,
  Lightbulb,
  FileText,
  ShieldCheck,
  Settings,
  UserCircle,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import type { UserRole } from '../../shared/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: UserRole[];
  section: 'Overview' | 'Academic Records' | 'Neural Engine' | 'Administration';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'], section: 'Overview' },
  { to: '/faculty', label: 'Faculty Dashboard', icon: LayoutDashboard, roles: ['faculty'], section: 'Overview' },
  { to: '/student', label: 'My Dashboard', icon: LayoutDashboard, roles: ['student'], section: 'Overview' },
  { to: '/analytics', label: 'Analytics Suite', icon: BarChart3, roles: ['admin', 'faculty'], section: 'Overview' },
  { to: '/students', label: 'Student Directory', icon: Users, roles: ['admin', 'faculty'], section: 'Academic Records' },
  { to: '/students/add', label: 'Register Student', icon: UserPlus, roles: ['admin', 'faculty'], section: 'Academic Records' },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb, roles: ['admin', 'faculty', 'student'], section: 'Academic Records' },
  { to: '/reports', label: 'Academic Reports', icon: FileText, roles: ['admin', 'faculty', 'student'], section: 'Academic Records' },
  { to: '/predict', label: 'Run Prediction', icon: Sparkles, roles: ['admin', 'faculty', 'student'], section: 'Neural Engine' },
  { to: '/predictions', label: 'Prediction History', icon: History, roles: ['admin', 'faculty', 'student'], section: 'Neural Engine' },
  { to: '/neural-lab', label: 'Neural Network Lab', icon: Network, roles: ['admin', 'faculty', 'student'], section: 'Neural Engine' },
  { to: '/training', label: 'Model Training', icon: Cpu, roles: ['admin', 'faculty'], section: 'Neural Engine' },
  { to: '/users', label: 'User Management', icon: ShieldCheck, roles: ['admin'], section: 'Administration' },
  { to: '/settings', label: 'System Settings', icon: Settings, roles: ['admin', 'faculty', 'student'], section: 'Administration' },
  { to: '/profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'faculty', 'student'], section: 'Administration' },
];

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/faculty': 'Faculty Dashboard',
  '/student': 'Student Dashboard',
  '/students': 'Student Directory',
  '/students/add': 'Register Student',
  '/predict': 'Performance Prediction',
  '/predictions': 'Prediction History',
  '/neural-lab': 'Neural Network Lab',
  '/training': 'Model Training Dashboard',
  '/analytics': 'Analytics Dashboard',
  '/recommendations': 'Recommendation Center',
  '/reports': 'Academic Reports',
  '/users': 'User Management',
  '/settings': 'System Settings',
  '/profile': 'Account Profile',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const sections: NavItem['section'][] = [
    'Overview',
    'Academic Records',
    'Neural Engine',
    'Administration',
  ];

  const currentPageTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.includes('/edit') ? 'Edit Student Record' : 'Workspace');

  const homePath =
    user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/student';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-15 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <Link
          to={homePath}
          onClick={() => setMobileOpen(false)}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap"
        >
          NeuroPredict
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => {
          const items = allowedItems.filter((i) => i.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section}>
              <p className="px-2.5 mb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/students'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="capitalize">{user.role}</span> · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="p-2 rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[82vw] bg-white dark:bg-slate-900 h-full shadow-xl z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-15 sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
              <Link
                to={homePath}
                className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                Workspace
              </Link>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {currentPageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/predict"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Predict Score</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
