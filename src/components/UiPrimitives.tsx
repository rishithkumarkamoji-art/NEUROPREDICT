import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { RiskCategory } from '../../shared/types';

export function RiskText({
  risk,
  className = '',
}: {
  risk: RiskCategory;
  className?: string;
}) {
  if (risk === 'Low Risk') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Low Risk</span>
      </span>
    );
  }
  if (risk === 'Medium Risk') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Medium Risk</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap ${className}`}
    >
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>High Risk</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  subtext,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const valueTone = {
    default: 'text-slate-900 dark:text-slate-50',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    red: 'text-red-700 dark:text-red-400',
    blue: 'text-blue-700 dark:text-blue-400',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-display font-semibold tabular-nums ${valueTone}`}>
        {value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">{subtext}</p>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-4" aria-busy="true" aria-label="Loading content">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 animate-pulse"
          />
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-9 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 py-12 px-6 text-center">
      <p className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 p-5 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            Unable to load requested data
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 whitespace-nowrap shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ModalDialog({
  open,
  title,
  description,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="modal-title" className="text-lg font-display font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog open={open} title={title} onClose={onCancel} maxWidth="max-w-md">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 text-sm font-medium rounded-lg text-white whitespace-nowrap ${
            destructive
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}

export function PerformanceGauge({
  score,
  lowerBound,
  upperBound,
  riskCategory,
  grade,
}: {
  score: number;
  lowerBound?: number;
  upperBound?: number;
  riskCategory: RiskCategory;
  grade: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 84;
  const cx = 110;
  const cy = 104;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const strokeColor =
    riskCategory === 'Low Risk'
      ? '#059669'
      : riskCategory === 'Medium Risk'
      ? '#D97706'
      : '#DC2626';

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg
        viewBox="0 0 220 124"
        className="w-56 h-32 overflow-visible"
        role="img"
        aria-label={`Predicted academic score ${clamped.toFixed(1)} percent, ${grade}, ${riskCategory}`}
      >
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          className="fill-slate-900 dark:fill-slate-50 font-display font-bold tabular-nums"
          style={{ fontSize: '30px' }}
        >
          {clamped.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-slate-500 dark:fill-slate-400 font-medium"
          style={{ fontSize: '12px' }}
        >
          {grade}
        </text>
      </svg>
      <div className="mt-1 flex flex-col items-center gap-1">
        <RiskText risk={riskCategory} />
        {lowerBound !== undefined && upperBound !== undefined && (
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            90% Interval: {lowerBound.toFixed(1)}% – {upperBound.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
