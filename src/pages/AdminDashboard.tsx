import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RefreshCw, Cpu, UserPlus } from 'lucide-react';
import { DEPARTMENTS, SECTIONS } from '../../shared/academicRules';
import {
  ActualVsPredictedChart,
  AttendanceVsScoreChart,
  DepartmentPerformanceChart,
  FeatureImportanceChart,
  MonthlyProgressChart,
  PerformanceDistributionChart,
  RiskDistributionChart,
  TrainingLossChart,
  ValidationLossChart,
} from '../components/AnalyticsCharts';
import {
  ErrorState,
  LoadingSkeleton,
  SectionHeader,
  StatCard,
} from '../components/UiPrimitives';
import { useThemeToast } from '../context/ThemeToastContext';
import { api, downloadBlob } from '../services/api';

export interface OverviewResponse {
  kpis: {
    totalStudents: number;
    avgPredictedScore: number;
    avgAttendance: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    modelVersion: string;
    modelLoaded: boolean;
    modelR2: number;
    modelMae: number;
    conformalHalfWidth: number;
    empiricalCoveragePct: number;
  };
  thresholds: { lowRiskMin: number; mediumRiskMin: number };
  performanceDistribution: { range: string; label: string; count: number }[];
  attendanceVsScore: {
    studentId: string;
    name: string;
    department: string;
    attendance: number;
    predictedScore: number;
    riskCategory: string;
  }[];
  riskDistribution: { name: string; value: number; color: string }[];
  departmentPerformance: {
    department: string;
    shortName: string;
    avgScore: number;
    avgAttendance: number;
    avgGPA: number;
    studentCount: number;
    highRiskCount: number;
  }[];
  monthlyProgress: { month: string; avgScore: number; avgAttendance: number }[];
  epochHistory: { epoch: number; loss: number; valLoss: number; mae: number; valMae: number }[];
  actualVsPredicted: { index: number; actual: number; predicted: number; error: number }[];
  featureImportance: {
    feature: any;
    label: string;
    importance: number;
    maeDelta: number;
  }[];
}

export function AdminDashboard({
  title = 'Admin Analytics Dashboard',
  description = 'Real-time academic risk intelligence, TensorFlow.js model calibration, and permutation feature importance across the student cohort.',
}: {
  title?: string;
  description?: string;
}) {
  const { notify } = useThemeToast();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [department, setDepartment] = useState('all');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('all');
  const [risk, setRisk] = useState('all');
  const [year, setYear] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (department !== 'all') params.department = department;
      if (semester) params.semester = semester;
      if (section !== 'all') params.section = section;
      if (risk !== 'all') params.risk = risk;
      if (year) params.year = year;

      const res = await api.get<OverviewResponse>('/analytics/overview', { params });
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [department, semester, section, risk, year]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleExportCsv = async () => {
    try {
      const params: Record<string, string> = {};
      if (department !== 'all') params.department = department;
      if (semester) params.semester = semester;
      if (section !== 'all') params.section = section;
      if (risk !== 'all') params.risk = risk;
      if (year) params.year = year;

      const res = await api.get('/analytics/export-csv', {
        params,
        responseType: 'blob',
      });
      downloadBlob(res.data, 'neuropredict-analytics.csv');
      notify('success', 'Analytics exported', 'Downloaded filtered cohort report as CSV.');
    } catch (err) {
      notify('error', 'Export failed', err instanceof Error ? err.message : undefined);
    }
  };

  const resetFilters = () => {
    setDepartment('all');
    setSemester('');
    setSection('all');
    setRisk('all');
    setYear('');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        description={description}
        actions={
          <>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <Link
              to="/training"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Train Model</span>
            </Link>
            <Link
              to="/students/add"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </Link>
          </>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label htmlFor="flt-dept" className="block text-xs font-medium text-slate-500 mb-1">
              Department
            </label>
            <select
              id="flt-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flt-sem" className="block text-xs font-medium text-slate-500 mb-1">
              Semester
            </label>
            <select
              id="flt-sem"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flt-sec" className="block text-xs font-medium text-slate-500 mb-1">
              Section
            </label>
            <select
              id="flt-sec"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="all">All Sections</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flt-risk" className="block text-xs font-medium text-slate-500 mb-1">
              Risk Category
            </label>
            <select
              id="flt-risk"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="all">All Risk Tiers</option>
              <option value="Low Risk">Low Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="High Risk">High Risk</option>
            </select>
          </div>
          <div>
            <label htmlFor="flt-year" className="block text-xs font-medium text-slate-500 mb-1">
              Enrollment Year
            </label>
            <select
              id="flt-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="">All Years</option>
              {[2022, 2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={fetchOverview}
              aria-label="Refresh analytics"
              className="p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSkeleton />}
      {!loading && error && <ErrorState message={error} onRetry={fetchOverview} />}

      {!loading && data && (
        <>
          {/* Top KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              label="Total Students"
              value={data.kpis.totalStudents}
              subtext={`Avg Attendance: ${data.kpis.avgAttendance}%`}
            />
            <StatCard
              label="Avg Predicted Score"
              value={`${data.kpis.avgPredictedScore}%`}
              tone="blue"
              subtext={`Interval: ±${data.kpis.conformalHalfWidth} pts`}
            />
            <StatCard
              label="Low Risk"
              value={data.kpis.lowRisk}
              tone="emerald"
              subtext={`Score ≥ ${data.thresholds.lowRiskMin}%`}
            />
            <StatCard
              label="Medium Risk"
              value={data.kpis.mediumRisk}
              tone="amber"
              subtext={`${data.thresholds.mediumRiskMin}–${data.thresholds.lowRiskMin - 0.01}%`}
            />
            <StatCard
              label="High Risk"
              value={data.kpis.highRisk}
              tone="red"
              subtext={`Score < ${data.thresholds.mediumRiskMin}%`}
            />
            <StatCard
              label="Active ANN Model"
              value={data.kpis.modelVersion}
              subtext={`R² ${data.kpis.modelR2.toFixed(3)} · ${data.kpis.empiricalCoveragePct}% cov.`}
            />
          </div>

          {/* Model Confidence Calibration & Feature Importance Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <FeatureImportanceChart data={data.featureImportance} />
            </div>
            <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Real-Time Model Calibration &amp; Uncertainty
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Rather than treating a Sigmoid output as probability confidence, NeuroPredict
                  computes a split-conformal 90% prediction interval from held-out validation
                  residuals.
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Held-Out Test R²</dt>
                    <dd className="mt-1 text-lg font-mono font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                      {data.kpis.modelR2.toFixed(4)}
                    </dd>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Test Set MAE</dt>
                    <dd className="mt-1 text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      ±{data.kpis.modelMae.toFixed(2)}%
                    </dd>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      90% Interval Half-Width
                    </dt>
                    <dd className="mt-1 text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      ±{data.kpis.conformalHalfWidth.toFixed(2)} pts
                    </dd>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Empirical Test Coverage
                    </dt>
                    <dd className="mt-1 text-lg font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {data.kpis.empiricalCoveragePct}%
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                Disclosure: Trained on a reproducible synthetic educational dataset (1,200 records)
                for NNDL academic demonstration.
              </p>
            </div>
          </div>

          {/* All 8 Required Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PerformanceDistributionChart data={data.performanceDistribution} />
            <AttendanceVsScoreChart data={data.attendanceVsScore} />
            <RiskDistributionChart data={data.riskDistribution} />
            <DepartmentPerformanceChart data={data.departmentPerformance} />
            <MonthlyProgressChart data={data.monthlyProgress} />
            <TrainingLossChart data={data.epochHistory} />
            <ValidationLossChart data={data.epochHistory} />
            <ActualVsPredictedChart data={data.actualVsPredicted} />
          </div>
        </>
      )}
    </div>
  );
}
