import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Sparkles, UserPlus } from 'lucide-react';
import type { RiskCategory, StudentRecord } from '../../shared/types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  ModalDialog,
  RiskText,
  SectionHeader,
  StatCard,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

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

export function FacultyDashboard() {
  const { user } = useAuth();
  const { notify } = useThemeToast();

  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [assignedOnly, setAssignedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<EnrichedStudent | null>(null);
  const [attendance, setAttendance] = useState(75);
  const [internalMarks, setInternalMarks] = useState(70);
  const [assignmentCompletion, setAssignmentCompletion] = useState(75);
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/students', {
        params: { assignedOnly: assignedOnly ? 'true' : 'false', limit: 50 },
      });
      setStudents(res.data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assigned students.');
    } finally {
      setLoading(false);
    }
  }, [assignedOnly]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const openQuickEdit = (s: EnrichedStudent) => {
    setEditing(s);
    setAttendance(s.attendance);
    setInternalMarks(s.internalMarks);
    setAssignmentCompletion(s.assignmentCompletion);
  };

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.put(`/students/${editing.id}`, {
        attendance: Number(attendance),
        internalMarks: Number(internalMarks),
        assignmentCompletion: Number(assignmentCompletion),
      });
      notify(
        'success',
        `Updated ${editing.fullName}`,
        `New ANN prediction: ${res.data.latestPrediction.predictedScore.toFixed(1)}% (${res.data.latestPrediction.riskCategory})`
      );
      setEditing(null);
      loadStudents();
    } catch (err) {
      notify('error', 'Update failed', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const highRiskCount = students.filter((s) => s.latestPrediction?.riskCategory === 'High Risk').length;
  const mediumRiskCount = students.filter((s) => s.latestPrediction?.riskCategory === 'Medium Risk').length;
  const avgScore =
    students.length > 0
      ? (
          students.reduce((sum, s) => sum + (s.latestPrediction?.predictedScore ?? 0), 0) /
          students.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Faculty Advisor Workspace"
        description={`Department focus: ${user?.department || 'All Departments'}. Update attendance, internal marks, and assignments to trigger instant neural network re-evaluation.`}
        actions={
          <>
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setAssignedOnly(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  assignedOnly
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                My Department
              </button>
              <button
                type="button"
                onClick={() => setAssignedOnly(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  !assignedOnly
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Cohorts
              </button>
            </div>
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

      {loading && <LoadingSkeleton />}
      {!loading && error && <ErrorState message={error} onRetry={loadStudents} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Students in View" value={students.length} />
            <StatCard label="Cohort Avg Score" value={`${avgScore}%`} tone="blue" />
            <StatCard label="High Risk Alerts" value={highRiskCount} tone="red" subtext="Immediate advising needed" />
            <StatCard label="Medium Risk Watchlist" value={mediumRiskCount} tone="amber" />
          </div>

          {students.length === 0 ? (
            <EmptyState
              title="No students found in this scope"
              description="Switch to All Cohorts or register a student under your department."
            />
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Student Academic Roster &amp; Quick Update
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Editing marks automatically runs the TensorFlow.js model
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                      <th className="py-3 px-4 font-medium">Student</th>
                      <th className="py-3 px-4 font-medium">Sem / Sec</th>
                      <th className="py-3 px-4 font-medium text-right">Attendance</th>
                      <th className="py-3 px-4 font-medium text-right">Internal</th>
                      <th className="py-3 px-4 font-medium text-right">Assignments</th>
                      <th className="py-3 px-4 font-medium text-right">Predicted</th>
                      <th className="py-3 px-4 font-medium">Risk Tier</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {s.fullName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {s.studentId} · {s.department}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          Sem {s.semester} · Sec {s.section}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {s.attendance}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {s.internalMarks}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {s.assignmentCompletion}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {s.latestPrediction ? `${s.latestPrediction.predictedScore.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {s.latestPrediction && <RiskText risk={s.latestPrediction.riskCategory} />}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openQuickEdit(s)}
                              aria-label={`Quick update ${s.fullName}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Update Marks</span>
                            </button>
                            <Link
                              to={`/predict?studentId=${s.studentId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 hover:bg-blue-600/20"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Predict</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ModalDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Quick Academic Update — ${editing.fullName}` : ''}
        description="Saving updates attendance, marks, and assignments in the database and runs a fresh TensorFlow.js prediction."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickSave} className="space-y-4">
          <div>
            <label htmlFor="qe-att" className="block text-sm font-medium mb-1">
              Attendance Percentage (0–100%)
            </label>
            <input
              id="qe-att"
              type="number"
              min={0}
              max={100}
              step={0.5}
              required
              value={attendance}
              onChange={(e) => setAttendance(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="qe-marks" className="block text-sm font-medium mb-1">
              Internal Examination Marks (0–100)
            </label>
            <input
              id="qe-marks"
              type="number"
              min={0}
              max={100}
              step={0.5}
              required
              value={internalMarks}
              onChange={(e) => setInternalMarks(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="qe-assign" className="block text-sm font-medium mb-1">
              Assignment Completion (0–100%)
            </label>
            <input
              id="qe-assign"
              type="number"
              min={0}
              max={100}
              step={0.5}
              required
              value={assignmentCompletion}
              onChange={(e) => setAssignmentCompletion(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {saving ? 'Updating & Predicting...' : 'Save & Re-Evaluate'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
