import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Upload,
  Download,
  Edit3,
  Trash2,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DEPARTMENTS, type ParsedCsvRow } from '../../shared/academicRules';
import type { RiskCategory, StudentRecord } from '../../shared/types';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ModalDialog,
  RiskText,
  SectionHeader,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api, downloadBlob } from '../services/api';

interface EnrichedStudent extends StudentRecord {
  latestPrediction: {
    id: string;
    predictedScore: number;
    predictedGrade: string;
    riskCategory: RiskCategory;
    modelVersion: string;
    createdAt: string;
  } | null;
}

export function StudentManagementPage() {
  const { user } = useAuth();
  const { notify } = useThemeToast();

  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [semester, setSemester] = useState('');
  const [risk, setRisk] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<EnrichedStudent | null>(null);

  // CSV Import State
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
    rows: ParsedCsvRow[];
  } | null>(null);
  const [csvReport, setCsvReport] = useState<{
    importedCount: number;
    failedCount: number;
    failures: { rowNumber: number; studentId: string; reason: string }[];
  } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 10,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (department !== 'all') params.department = department;
      if (semester) params.semester = semester;
      if (risk !== 'all') params.risk = risk;

      const res = await api.get('/students', { params });
      setStudents(res.data.students);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load student records.');
    } finally {
      setLoading(false);
    }
  }, [page, search, department, semester, risk, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      notify('success', 'Student removed', `${deleteTarget.fullName} (${deleteTarget.studentId}) deleted.`);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      notify('error', 'Delete failed', err instanceof Error ? err.message : undefined);
    }
  };

  const handleDownloadSampleCsv = async () => {
    try {
      const res = await api.get('/students/sample-csv', { responseType: 'blob' });
      downloadBlob(res.data, 'neuropredict-sample-students.csv');
      notify('info', 'Sample CSV downloaded', 'Use this template to test bulk student import.');
    } catch (err) {
      notify('error', 'Download failed', err instanceof Error ? err.message : undefined);
    }
  };

  const handleFileChange = async (file: File | null) => {
    setCsvFile(file);
    setCsvPreview(null);
    setCsvReport(null);
    setCsvError('');
    if (!file) return;

    setCsvLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/students/import?preview=true', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvPreview(res.data);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvError('');
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const res = await api.post('/students/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvReport(res.data);
      notify(
        'success',
        'CSV import complete',
        `Imported ${res.data.importedCount} student(s) with ANN predictions.`
      );
      fetchStudents();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Student Directory & Records"
        description="Search, filter, update, and bulk-import student academic profiles connected to the neural prediction pipeline."
        actions={
          <>
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvOpen(true);
                setCsvFile(null);
                setCsvPreview(null);
                setCsvReport(null);
                setCsvError('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
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

      {/* Search & Filters */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search students by name, ID, or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, student ID, or email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <select
            aria-label="Filter by department"
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
            aria-label="Filter by semester"
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={String(s)}>
                Semester {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by risk category"
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
      </div>

      {loading && <LoadingSkeleton rows={6} />}
      {!loading && error && <ErrorState message={error} onRetry={fetchStudents} />}

      {!loading && !error && students.length === 0 && (
        <EmptyState
          title="No matching student records"
          description="Adjust your search or filters, or register a new student to begin tracking."
          action={
            <Link
              to="/students/add"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Register Student
            </Link>
          }
        />
      )}

      {!loading && !error && students.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('fullName')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <span>Student</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium">Program</th>
                  <th className="py-3 px-4 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('attendance')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <span>Attendance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium text-right">Internal</th>
                  <th className="py-3 px-4 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('previousGPA')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <span>GPA</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('predictedScore')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <span>Predicted</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-medium">Risk</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{s.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {s.studentId} · {s.email}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <p className="truncate max-w-[190px]">{s.department}</p>
                      <p className="text-slate-400">
                        Sem {s.semester} · Sec {s.section} · {s.enrollmentYear}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{s.attendance}%</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{s.internalMarks}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {s.previousGPA.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                      {s.latestPrediction ? `${s.latestPrediction.predictedScore.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {s.latestPrediction && <RiskText risk={s.latestPrediction.riskCategory} />}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/predict?studentId=${s.studentId}`}
                          aria-label={`Predict performance for ${s.fullName}`}
                          className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          title="Run Prediction"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/students/${s.id}/edit`}
                          aria-label={`Edit ${s.fullName}`}
                          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Student"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            aria-label={`Delete ${s.fullName}`}
                            className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="tabular-nums">
              Showing {students.length} of {pagination.total} students · Page {pagination.page} of{' '}
              {pagination.totalPages}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Student Record"
        message={`Are you sure you want to permanently remove ${deleteTarget?.fullName} (${deleteTarget?.studentId})?`}
        confirmLabel="Delete Student"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* CSV Import Modal with Validation, Preview & Duplicate Detection */}
      <ModalDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        title="Bulk CSV Student Import"
        description="Upload a CSV file to validate columns, inspect duplicates, and auto-generate ANN predictions upon import."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Select a .csv roster file (max 2 MB)
              </p>
              <p className="mt-0.5 text-slate-500">
                Required columns: studentId, fullName, email, department, semester, section,
                enrollmentYear, attendance, internalMarks, previousGPA, assignmentCompletion,
                weeklyStudyHours, previousPerformance, subjectsNeedingImprovement, participationScore
              </p>
            </div>
            <label className="px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer whitespace-nowrap shrink-0 text-center">
              Choose CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {csvError && (
            <div role="alert" className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {csvError}
            </div>
          )}

          {csvLoading && <p className="text-xs text-slate-500">Validating CSV rows...</p>}

          {csvPreview && !csvReport && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <span>Total rows: {csvPreview.totalRows}</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Valid: {csvPreview.validCount}
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  Duplicates: {csvPreview.duplicateCount}
                </span>
                <span className="text-red-700 dark:text-red-400">
                  Invalid: {csvPreview.invalidCount}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Student ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Attendance</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {csvPreview.rows.slice(0, 25).map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="py-2 px-3 font-mono">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-mono">{r.data.studentId || '—'}</td>
                        <td className="py-2 px-3">{r.data.fullName || '—'}</td>
                        <td className="py-2 px-3 font-mono">{r.data.attendance}%</td>
                        <td className="py-2 px-3">
                          {r.valid ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Ready
                            </span>
                          ) : r.isDuplicate ? (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              Duplicate ID
                            </span>
                          ) : (
                            <span className="text-red-700 dark:text-red-400">
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCsvOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvPreview.validCount === 0 || csvLoading}
                  onClick={handleConfirmCsvImport}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  Import {csvPreview.validCount} Valid Record(s)
                </button>
              </div>
            </div>
          )}

          {csvReport && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 text-xs space-y-2">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Import Completed: {csvReport.importedCount} succeeded · {csvReport.failedCount}{' '}
                skipped
              </p>
              {csvReport.failures.length > 0 && (
                <ul className="list-disc pl-4 text-slate-700 dark:text-slate-300 space-y-0.5">
                  {csvReport.failures.slice(0, 8).map((f) => (
                    <li key={f.rowNumber}>
                      Row {f.rowNumber} ({f.studentId}): {f.reason}
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCsvOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  );
}
