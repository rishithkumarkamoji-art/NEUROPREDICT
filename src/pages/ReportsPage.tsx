import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import type { PredictionRecord, RecommendationItem, StudentRecord } from '../../shared/types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PerformanceGauge,
  SectionHeader,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api, downloadBlob } from '../services/api';
import { generatePredictionPdfReport } from '../utils/pdfReport';

interface StudentReportBundle {
  generatedAt: string;
  institutionName: string;
  academicYear: string;
  disclaimer: string;
  student: StudentRecord;
  latestPrediction: PredictionRecord | null;
  predictionHistory: PredictionRecord[];
  recommendations: RecommendationItem[];
  departmentAverage: number;
}

export function ReportsPage() {
  const { user } = useAuth();
  const { notify } = useThemeToast();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [bundle, setBundle] = useState<StudentReportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/students', { params: { limit: 100 } })
      .then((res) => {
        const list: StudentRecord[] = res.data.students ?? [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedId(list[0].studentId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load roster.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setReportLoading(true);
    api
      .get<StudentReportBundle>(`/reports/student/${selectedId}`)
      .then((res) => setBundle(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load report.'))
      .finally(() => setReportLoading(false));
  }, [selectedId]);

  const handleDownloadPdf = () => {
    if (!bundle || !bundle.latestPrediction) return;
    generatePredictionPdfReport({
      studentId: bundle.student.studentId,
      studentName: bundle.student.fullName,
      department: bundle.student.department,
      semester: bundle.student.semester,
      prediction: bundle.latestPrediction,
      recommendations: bundle.recommendations,
      departmentAverage: bundle.departmentAverage,
      institutionName: bundle.institutionName,
    });
    notify('success', 'PDF report saved', `Exported report for ${bundle.student.fullName}.`);
  };

  const handleExportCohortCsv = async () => {
    try {
      const res = await api.get('/analytics/export-csv', { responseType: 'blob' });
      downloadBlob(res.data, 'neuropredict-cohort-report.csv');
      notify('success', 'Cohort CSV exported');
    } catch (err) {
      notify('error', 'Export failed', err instanceof Error ? err.message : undefined);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Academic Prediction Reports"
        description="Preview structured student performance reports, verify calibrated uncertainty bounds, and export PDF or cohort CSV summaries."
        actions={
          <>
            {user?.role !== 'student' && (
              <button
                type="button"
                onClick={handleExportCohortCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Cohort CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
            <button
              type="button"
              disabled={!bundle?.latestPrediction}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>
          </>
        }
      />

      {students.length === 0 ? (
        <EmptyState
          title="No student records available for reporting"
          description="Add a student or run a prediction to generate academic reports."
        />
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="rep-student" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Select Student Report:
            </label>
            <select
              id="rep-student"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm max-w-md w-full"
            >
              {students.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.studentId} — {s.fullName} ({s.department})
                </option>
              ))}
            </select>
          </div>

          {reportLoading && <LoadingSkeleton rows={4} />}

          {!reportLoading && bundle && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    {bundle.institutionName} · Academic Year {bundle.academicYear}
                  </p>
                  <h2 className="mt-1 text-2xl font-display font-bold text-slate-900 dark:text-slate-50">
                    {bundle.student.fullName}
                  </h2>
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    {bundle.student.studentId} · {bundle.student.department} · Semester{' '}
                    {bundle.student.semester} · Section {bundle.student.section}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Generated: {new Date(bundle.generatedAt).toLocaleString()}
                </p>
              </div>

              {bundle.latestPrediction && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5">
                    <PerformanceGauge
                      score={bundle.latestPrediction.predictedScore}
                      lowerBound={bundle.latestPrediction.uncertaintyBand.lowerBound}
                      upperBound={bundle.latestPrediction.uncertaintyBand.upperBound}
                      riskCategory={bundle.latestPrediction.riskCategory}
                      grade={bundle.latestPrediction.predictedGrade}
                    />
                  </div>
                  <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    {[
                      ['Attendance', `${bundle.student.attendance}%`],
                      ['Internal Marks', `${bundle.student.internalMarks}/100`],
                      ['Previous GPA', `${bundle.student.previousGPA.toFixed(2)}/10`],
                      ['Assignments', `${bundle.student.assignmentCompletion}%`],
                      ['Study Hours', `${bundle.student.weeklyStudyHours} hrs/wk`],
                      ['Dept. Average', `${bundle.departmentAverage.toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="border-t border-slate-200 dark:border-slate-800 pt-2.5">
                        <p className="text-slate-500">{k}</p>
                        <p className="mt-1 text-base font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Recommended Action Plan (Rule-Based Engine)
                </h3>
                <div className="space-y-3">
                  {bundle.recommendations.map((rec) => (
                    <div key={rec.id} className="text-xs">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {rec.title} ({rec.priority} Priority · {rec.category})
                      </p>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-300">{rec.actionPlan}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 italic">
                {bundle.disclaimer}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
