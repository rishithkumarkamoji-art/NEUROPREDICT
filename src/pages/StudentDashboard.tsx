import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PredictionRecord, RecommendationItem, StudentRecord } from '../../shared/types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PerformanceGauge,
  SectionHeader,
  StatCard,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';
import { generatePredictionPdfReport } from '../utils/pdfReport';

export function StudentDashboard() {
  const { user, studentProfile } = useAuth();
  const { notify } = useThemeToast();

  const [student, setStudent] = useState<StudentRecord | null>(studentProfile);
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [deptAvg, setDeptAvg] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPersonalData() {
      setLoading(true);
      setError('');
      try {
        const stuList = await api.get('/students');
        const own: StudentRecord | undefined = stuList.data.students?.[0];
        if (!own) {
          setStudent(null);
          setLoading(false);
          return;
        }
        setStudent(own);
        const rep = await api.get(`/reports/student/${own.studentId}`);
        setPredictions(rep.data.predictionHistory ?? []);
        setRecommendations(rep.data.recommendations ?? []);
        setDeptAvg(rep.data.departmentAverage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your academic dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadPersonalData();
  }, []);

  const latest = predictions[0] ?? null;

  const handleDownloadPdf = () => {
    if (!student || !latest) return;
    generatePredictionPdfReport({
      studentId: student.studentId,
      studentName: student.fullName,
      department: student.department,
      semester: student.semester,
      prediction: latest,
      recommendations,
      departmentAverage: deptAvg,
    });
    notify('success', 'Report downloaded', `Saved PDF report for ${student.studentId}.`);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  if (!student) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title={`Welcome, ${user?.name}`}
          description="Your account does not yet have a linked academic roster record. You can still run self-assessment predictions using the Prediction Simulator."
          actions={
            <Link
              to="/predict"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Self-Assessment</span>
            </Link>
          }
        />
        <EmptyState
          title="No linked institutional roster profile"
          description="Ask an Administrator or Faculty advisor to register your email under Student Records, or run an ad-hoc prediction to receive tailored recommendations."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome back, ${student.fullName}`}
        description={`${student.studentId} · ${student.department} · Semester ${student.semester} · Section ${student.section} — Private personal academic view.`}
        actions={
          <>
            {latest && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>
            )}
            <Link
              to={`/predict?studentId=${student.studentId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>What-If Simulator</span>
            </Link>
          </>
        }
      />

      {/* Top Row: Gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Predicted Semester Performance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generated by TensorFlow.js Model {latest?.modelVersion ?? 'v1.0'}
            </p>
          </div>
          {latest ? (
            <PerformanceGauge
              score={latest.predictedScore}
              lowerBound={latest.uncertaintyBand.lowerBound}
              upperBound={latest.uncertaintyBand.upperBound}
              riskCategory={latest.riskCategory}
              grade={latest.predictedGrade}
            />
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No prediction generated yet.</p>
          )}
          {deptAvg !== undefined && latest && (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 font-mono tabular-nums">
              Department Avg: {deptAvg.toFixed(1)}% ({latest.predictedScore >= deptAvg ? '+' : ''}
              {(latest.predictedScore - deptAvg).toFixed(1)} pts)
            </p>
          )}
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Attendance"
            value={`${student.attendance}%`}
            tone={student.attendance >= 75 ? 'emerald' : 'red'}
            subtext="Target: ≥ 75%"
          />
          <StatCard
            label="Internal Exam Marks"
            value={`${student.internalMarks}/100`}
            tone={student.internalMarks >= 65 ? 'blue' : 'amber'}
          />
          <StatCard label="Previous GPA" value={`${student.previousGPA.toFixed(2)}/10`} />
          <StatCard label="Assignments Completed" value={`${student.assignmentCompletion}%`} />
          <StatCard label="Weekly Study Hours" value={`${student.weeklyStudyHours} hrs`} />
          <StatCard
            label="Subjects to Improve"
            value={student.subjectsNeedingImprovement}
            tone={student.subjectsNeedingImprovement === 0 ? 'emerald' : 'amber'}
          />
        </div>
      </div>

      {/* Improvement Trend Chart + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Academic Progress &amp; GPA Trajectory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            6-month attendance, performance score, and GPA progression
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={student.history} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="score" name="Academic Score (%)" stroke="#2563EB" strokeWidth={2} />
                <Line type="monotone" dataKey="attendance" name="Attendance (%)" stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Personalized Action Plan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rule-Based Academic Advisor Engine
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="pb-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rec.actionPlan}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {rec.category} · {rec.triggerReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
