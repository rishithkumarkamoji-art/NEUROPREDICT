import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEPARTMENTS, generateRuleBasedRecommendations } from '../../shared/academicRules';
import type { PredictionRecord } from '../../shared/types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ModalDialog,
  PerformanceGauge,
  RiskText,
  SectionHeader,
} from '../components/UiPrimitives';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';
import { generatePredictionPdfReport } from '../utils/pdfReport';

export function PredictionHistoryPage() {
  const { notify } = useThemeToast();
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [department, setDepartment] = useState('all');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<PredictionRecord | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (search.trim()) params.search = search.trim();
      if (risk !== 'all') params.risk = risk;
      if (department !== 'all') params.department = department;
      const res = await api.get('/predictions', { params });
      setPredictions(res.data.predictions);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load prediction history.');
    } finally {
      setLoading(false);
    }
  }, [page, search, risk, department]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExportPdf = (pred: PredictionRecord) => {
    const recs = generateRuleBasedRecommendations(pred.inputFeatures, pred.predictedScore);
    generatePredictionPdfReport({
      studentId: pred.studentId,
      studentName: pred.studentName,
      department: pred.department,
      semester: pred.semester,
      prediction: pred,
      recommendations: recs,
    });
    notify('success', 'PDF generated', `Downloaded report for ${pred.studentName}.`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Prediction History & Audit Log"
        description="Complete chronological log of TensorFlow.js inference runs stored in the database, including model version and uncertainty bounds."
      />

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search predictions"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <select
          aria-label="Filter predictions by department"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter predictions by risk"
          value={risk}
          onChange={(e) => {
            setRisk(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
        >
          <option value="all">All Risk Tiers</option>
          <option value="Low Risk">Low Risk</option>
          <option value="Medium Risk">Medium Risk</option>
          <option value="High Risk">High Risk</option>
        </select>
      </div>

      {loading && <LoadingSkeleton rows={6} />}
      {!loading && error && <ErrorState message={error} onRetry={loadHistory} />}
      {!loading && !error && predictions.length === 0 && (
        <EmptyState
          title="No prediction records match your filter"
          description="Run a new prediction or clear your active search filters."
        />
      )}

      {!loading && !error && predictions.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium text-right">Score</th>
                  <th className="py-3 px-4 font-medium">90% Interval</th>
                  <th className="py-3 px-4 font-medium">Grade</th>
                  <th className="py-3 px-4 font-medium">Risk</th>
                  <th className="py-3 px-4 font-medium">Model</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {p.studentName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {p.studentId} · Sem {p.semester}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      {p.predictedScore.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {p.uncertaintyBand.lowerBound.toFixed(1)}–{p.uncertaintyBand.upperBound.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {p.predictedGrade}
                    </td>
                    <td className="py-3 px-4">
                      <RiskText risk={p.riskCategory} />
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{p.modelVersion}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          aria-label={`Inspect prediction for ${p.studentName}`}
                          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(p)}
                          aria-label={`Download PDF report for ${p.studentName}`}
                          className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="tabular-nums">
              {pagination.total} total records · Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Prediction Detail — ${selected.studentName}` : ''}
        description={selected ? `${selected.studentId} · Model ${selected.modelVersion} · ${new Date(selected.createdAt).toLocaleString()}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            <PerformanceGauge
              score={selected.predictedScore}
              lowerBound={selected.uncertaintyBand.lowerBound}
              upperBound={selected.uncertaintyBand.upperBound}
              riskCategory={selected.riskCategory}
              grade={selected.predictedGrade}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(selected.inputFeatures).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2"
                >
                  <p className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-0.5 font-mono font-semibold tabular-nums">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
