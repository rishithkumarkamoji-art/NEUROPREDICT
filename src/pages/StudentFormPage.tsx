import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { DEPARTMENTS, SECTIONS, validateAcademicFeatures } from '../../shared/academicRules';
import { LoadingSkeleton, SectionHeader } from '../components/UiPrimitives';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

export function StudentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useThemeToast();

  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    studentId: '',
    fullName: '',
    email: '',
    department: DEPARTMENTS[0] as string,
    semester: 6,
    section: 'A',
    enrollmentYear: 2024,
    attendance: 82,
    internalMarks: 76,
    previousGPA: 7.8,
    assignmentCompletion: 85,
    weeklyStudyHours: 18,
    previousPerformance: 78,
    subjectsNeedingImprovement: 0,
    participationScore: 76,
  });

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    api
      .get(`/students/${id}`)
      .then((res) => {
        const s = res.data.student;
        setForm({
          studentId: s.studentId,
          fullName: s.fullName,
          email: s.email,
          department: s.department,
          semester: s.semester,
          section: s.section,
          enrollmentYear: s.enrollmentYear,
          attendance: s.attendance,
          internalMarks: s.internalMarks,
          previousGPA: s.previousGPA,
          assignmentCompletion: s.assignmentCompletion,
          weeklyStudyHours: s.weeklyStudyHours,
          previousPerformance: s.previousPerformance,
          subjectsNeedingImprovement: s.subjectsNeedingImprovement,
          participationScore: s.participationScore,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load student.'))
      .finally(() => setLoading(false));
  }, [mode, id]);

  const setField = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.studentId.trim() || !form.fullName.trim() || !form.email.includes('@')) {
      setError('Student ID, full name, and a valid institutional email are required.');
      return;
    }

    const featCheck = validateAcademicFeatures({
      attendance: Number(form.attendance),
      internalMarks: Number(form.internalMarks),
      previousGPA: Number(form.previousGPA),
      assignmentCompletion: Number(form.assignmentCompletion),
      weeklyStudyHours: Number(form.weeklyStudyHours),
      previousPerformance: Number(form.previousPerformance),
      subjectsNeedingImprovement: Number(form.subjectsNeedingImprovement),
      participationScore: Number(form.participationScore),
      semester: Number(form.semester),
    });

    if (!featCheck.valid) {
      setError(Object.values(featCheck.errors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'add') {
        const res = await api.post('/students', form);
        notify(
          'success',
          'Student registered',
          `${form.fullName} added. Baseline ANN score: ${res.data.initialPrediction.predictedScore.toFixed(1)}%.`
        );
      } else {
        const res = await api.put(`/students/${id}`, form);
        notify(
          'success',
          'Student record updated',
          `Updated ANN prediction: ${res.data.latestPrediction.predictedScore.toFixed(1)}%.`
        );
      }
      navigate('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        title={mode === 'add' ? 'Register New Student' : `Edit Student — ${form.studentId}`}
        description="All 9 numeric academic indicators are validated and immediately evaluated by the saved TensorFlow.js model upon saving."
        actions={
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Directory</span>
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
        noValidate
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
            Personal &amp; Enrollment Details
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sf-id" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Student ID *
              </label>
              <input
                id="sf-id"
                type="text"
                required
                disabled={mode === 'edit'}
                value={form.studentId}
                onChange={(e) => setField('studentId', e.target.value.toUpperCase())}
                placeholder="e.g. NP2026099"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="sf-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Full Name *
              </label>
              <input
                id="sf-name"
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                placeholder="e.g. Rohan Deshmukh"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sf-email" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Email Address *
              </label>
              <input
                id="sf-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="student@neuropredict.edu"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sf-dept" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Department *
              </label>
              <select
                id="sf-dept"
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sf-sem" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Semester (1–8) *
              </label>
              <select
                id="sf-sem"
                value={form.semester}
                onChange={(e) => setField('semester', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sf-sec" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Section *
                </label>
                <select
                  id="sf-sec"
                  value={form.section}
                  onChange={(e) => setField('section', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sf-year" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Enroll Year *
                </label>
                <input
                  id="sf-year"
                  type="number"
                  min={2018}
                  max={2030}
                  value={form.enrollmentYear}
                  onChange={(e) => setField('enrollmentYear', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
            Academic Performance Indicators (ANN Input Features)
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'attendance', label: 'Attendance (%)', min: 0, max: 100, step: 0.5 },
              { id: 'internalMarks', label: 'Internal Marks (/100)', min: 0, max: 100, step: 0.5 },
              { id: 'previousGPA', label: 'Previous GPA (0–10)', min: 0, max: 10, step: 0.1 },
              { id: 'assignmentCompletion', label: 'Assignments (%)', min: 0, max: 100, step: 0.5 },
              { id: 'weeklyStudyHours', label: 'Weekly Study Hours', min: 0, max: 45, step: 0.5 },
              { id: 'previousPerformance', label: 'Previous Score (%)', min: 0, max: 100, step: 0.5 },
              { id: 'subjectsNeedingImprovement', label: 'Subjects to Improve (0–8)', min: 0, max: 8, step: 1 },
              { id: 'participationScore', label: 'Participation Score (/100)', min: 0, max: 100, step: 1 },
            ].map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={`sf-${field.id}`}
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {field.label}
                </label>
                <input
                  id={`sf-${field.id}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  required
                  value={form[field.id as keyof typeof form]}
                  onChange={(e) => setField(field.id as keyof typeof form, Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            to="/students"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving & Scoring...' : mode === 'add' ? 'Register Student' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
