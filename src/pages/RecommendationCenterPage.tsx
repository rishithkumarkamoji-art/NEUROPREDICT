import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import type { RecommendationItem, RiskCategory } from '../../shared/types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  RiskText,
  SectionHeader,
} from '../components/UiPrimitives';
import { api } from '../services/api';

interface RecCenterEntry {
  studentId: string;
  studentName: string;
  department: string;
  semester: number;
  attendance: number;
  internalMarks: number;
  predictedScore: number | null;
  riskCategory: RiskCategory;
  engineType: 'rule-based';
  recommendations: RecommendationItem[];
  updatedAt: string;
}

export function RecommendationCenterPage() {
  const [items, setItems] = useState<RecCenterEntry[]>([]);
  const [disclosure, setDisclosure] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskCategory>('all');

  useEffect(() => {
    setLoading(true);
    api
      .get('/recommendations')
      .then((res) => {
        setItems(res.data.items ?? []);
        setDisclosure(res.data.engineDisclosure ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load recommendations.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.studentName.toLowerCase().includes(q) ||
      item.studentId.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q);
    const matchesRisk = riskFilter === 'all' || item.riskCategory === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Academic Recommendation Center"
        description={
          disclosure ||
          'Deterministic rule-based academic advising plans derived from each student’s actual indicators and neural network risk score.'
        }
      />

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Search recommendations by student"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, ID, or department..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
          {(['all', 'High Risk', 'Medium Risk', 'Low Risk'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setRiskFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                riskFilter === tier
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : tier}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSkeleton rows={5} />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title="No recommendations in this filter"
          description="Try switching to All Tiers or clearing your search query."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((entry) => (
            <div
              key={entry.studentId}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {entry.studentName}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      {entry.studentId} · {entry.department} · Sem {entry.semester}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {entry.predictedScore !== null ? `${entry.predictedScore.toFixed(1)}%` : '—'}
                    </p>
                    <RiskText risk={entry.riskCategory} />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {entry.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {rec.title}
                        </p>
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${
                            rec.priority === 'High'
                              ? 'text-red-600 dark:text-red-400'
                              : rec.priority === 'Medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {rec.priority} · {rec.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rec.actionPlan}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{rec.triggerReason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Engine: Rule-Based Advisor</span>
                <Link
                  to={`/predict?studentId=${entry.studentId}`}
                  className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Improvement</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
