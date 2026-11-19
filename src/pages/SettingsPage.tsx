import React, { useEffect, useState } from 'react';
import { Save, Sun, Moon } from 'lucide-react';
import type { SystemSettings } from '../../shared/types';
import { LoadingSkeleton, SectionHeader } from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme, notify } = useThemeToast();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [storage, setStorage] = useState<{ mode: string; detail: string } | null>(null);
  const [modelStatus, setModelStatus] = useState<{
    modelVersion: string | null;
    backend: string;
    storagePath: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        setSettings(res.data.settings);
        setStorage(res.data.storage);
        setModelStatus(res.data.modelStatus);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      setSettings(res.data.settings);
      notify('success', 'Settings saved', 'Academic risk thresholds updated across dashboards.');
    } catch (err) {
      notify('error', 'Save failed', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <LoadingSkeleton rows={4} />;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        title="System Settings & Configuration"
        description="Configure academic risk classification thresholds, interface appearance, and review active storage & TensorFlow.js runtime disclosures."
      />

      {/* Appearance */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Interface Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between crisp daylight mode and low-glare dark workspace mode.
          </p>
        </div>
        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
              theme === 'dark'
                ? 'bg-slate-900 text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Configurable Risk Thresholds */}
      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configurable Academic Risk Thresholds
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controls Low Risk, Medium Risk, and High Risk cutoffs used across predictions and
              analytics.
            </p>
          </div>
          {!isAdmin && (
            <span className="text-xs text-amber-700 dark:text-amber-400">Read-only (Admin only)</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-low" className="block text-xs font-medium mb-1">
              Low Risk Minimum Score (%)
            </label>
            <input
              id="st-low"
              type="number"
              min={40}
              max={95}
              disabled={!isAdmin}
              value={settings.riskThresholds.lowRiskMin}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  riskThresholds: { ...settings.riskThresholds, lowRiskMin: Number(e.target.value) },
                })
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Scores ≥ {settings.riskThresholds.lowRiskMin}% are classified Low Risk.
            </p>
          </div>

          <div>
            <label htmlFor="st-med" className="block text-xs font-medium mb-1">
              Medium Risk Minimum Score (%)
            </label>
            <input
              id="st-med"
              type="number"
              min={15}
              max={85}
              disabled={!isAdmin}
              value={settings.riskThresholds.mediumRiskMin}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  riskThresholds: {
                    ...settings.riskThresholds,
                    mediumRiskMin: Number(e.target.value),
                  },
                })
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Scores below {settings.riskThresholds.mediumRiskMin}% trigger High Risk alerts.
            </p>
          </div>

          <div>
            <label htmlFor="st-inst" className="block text-xs font-medium mb-1">
              Institution Name (PDF Reports)
            </label>
            <input
              id="st-inst"
              type="text"
              disabled={!isAdmin}
              value={settings.institutionName}
              onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="st-year" className="block text-xs font-medium mb-1">
              Academic Year
            </label>
            <input
              id="st-year"
              type="text"
              disabled={!isAdmin}
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Transparent Runtime & Academic Disclosures */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 text-xs">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Architecture &amp; Academic Disclosures
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Database Persistence</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Active mode: <span className="font-mono">{storage?.mode}</span> — {storage?.detail}
            </p>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              TensorFlow.js Runtime
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Model <span className="font-mono">{modelStatus?.modelVersion}</span> · Backend:{' '}
              <span className="font-mono">{modelStatus?.backend}</span> · Saved weights reloaded on
              startup.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Synthetic Dataset Academic Notice
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
            {settings.syntheticDataDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
