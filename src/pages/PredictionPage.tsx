import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Sparkles, RotateCcw } from 'lucide-react';
import {
  DEPARTMENTS,
  FEATURE_METADATA,
  validateAcademicFeatures,
} from '../../shared/academicRules';
import type {
  AcademicFeatures,
  PredictionRecord,
  RecommendationItem,
  StudentRecord,
} from '../../shared/types';
import { PerformanceGauge, SectionHeader } from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';
import { generatePredictionPdfReport } from '../utils/pdfReport';

interface PredictionResponse {
  prediction: PredictionRecord;
  recommendations: { engineType: 'rule-based'; recommendations: RecommendationItem[] };
  benchmarks: {
    departmentAverage: number;
    overallAverage: number;
    deltaFromDepartment: number;
  };
}

const DEFAULT_FEATURES: AcademicFeatures = {
  attendance: 82,
  internalMarks: 74,
  previousGPA: 7.6,
  assignmentCompletion: 80,
  weeklyStudyHours: 16,
  previousPerformance: 75,
  subjectsNeedingImprovement: 1,
  participationScore: 74,
  semester: 6,
};

export function PredictionPage() {
  const { user } = useAuth();
  const { notify } = useThemeToast();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    searchParams.get('studentId') || 'AD-HOC'
  );
  const [studentName, setStudentName] = useState<string>(user?.name || 'Custom Profile');
  const [department, setDepartment] = useState<string>(
    user?.department || DEPARTMENTS[0]
  );
  const [features, setFeatures] = useState<AcademicFeatures>(DEFAULT_FEATURES);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    api
      .get('/students', { params: { limit: 100 } })
      .then((res) => {
        const list: StudentRecord[] = res.data.students ?? [];
        setStudents(list);

        const paramId = searchParams.get('studentId');
        const match = paramId
          ? list.find((s) => s.studentId.toUpperCase() === paramId.toUpperCase())
          : user?.role === 'student'
          ? list[0]
          : undefined;

        if (match) {
          applyStudent(match);
        }
      })
      .catch(() => {});
  }, [searchParams, user?.role]);

  const applyStudent = (s: StudentRecord) => {
    setSelectedStudentId(s.studentId);
    setStudentName(s.fullName);
    setDepartment(s.department);
    setFeatures({
      attendance: s.attendance,
      internalMarks: s.internalMarks,
      previousGPA: s.previousGPA,
      assignmentCompletion: s.assignmentCompletion,
      weeklyStudyHours: s.weeklyStudyHours,
      previousPerformance: s.previousPerformance,
      subjectsNeedingImprovement: s.subjectsNeedingImprovement,
      participationScore: s.participationScore,
      semester: s.semester,
    });
  };

  const handleStudentSelect = (val: string) => {
    setSelectedStudentId(val);
    if (val === 'AD-HOC') {
      setStudentName('Ad-Hoc Simulation');
      return;
    }
    const found = students.find((s) => s.studentId === val);
    if (found) applyStudent(found);
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const check = validateAcademicFeatures(features);
    if (!check.valid) {
      setError(Object.values(check.errors)[0]);
      return;
    }

    setRunning(true);
    try {
      const res = await api.post<PredictionResponse>('/predictions/predict', {
        studentId: selectedStudentId,
        studentName,
        department,
        ...features,
      });
      setResult(res.data);
      notify(
        'success',
        'Prediction saved',
        `Predicted ${res.data.prediction.predictedScore.toFixed(1)}% (${res.data.prediction.riskCategory}) using Model ${res.data.prediction.modelVersion}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction request failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generatePredictionPdfReport({
      studentId: result.prediction.studentId,
      studentName: result.prediction.studentName,
      department: result.prediction.department,
      semester: result.prediction.semester,
      prediction: result.prediction,
      recommendations: result.recommendations.recommendations,
      departmentAverage: result.benchmarks.departmentAverage,
    });
    notify('success', 'PDF downloaded', 'Prediction report saved to your device.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Student Performance Prediction"
        description="Submit validated academic features to the trained TensorFlow.js 9→16→8→1 neural network. Every prediction is persisted and paired with a calibrated 90% conformal uncertainty interval."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 9-Feature Input Form */}
        <form
          onSubmit={handlePredict}
          className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
          noValidate
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Academic Input Profile (9 Features)
            </h2>
            <button
              type="button"
              onClick={() => setFeatures(DEFAULT_FEATURES)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pred-student" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Load Student Record
              </label>
              <select
                id="pred-student"
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                <option value="AD-HOC">Custom What-If Simulation</option>
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentId} — {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pred-dept" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Department Benchmark
              </label>
              <select
                id="pred-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {FEATURE_METADATA.map((meta) => {
              const val = features[meta.key];
              return (
                <div key={meta.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`pf-${meta.key}`}
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                      title={meta.label}
                    >
                      {meta.label}
                    </label>
                    <span className="text-xs font-mono font-semibold tabular-nums text-blue-700 dark:text-blue-400 whitespace-nowrap shrink-0">
                      {val} {meta.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      aria-label={`${meta.label} slider`}
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={val}
                      onChange={(e) =>
                        setFeatures((prev) => ({ ...prev, [meta.key]: Number(e.target.value) }))
                      }
                      className="flex-1 accent-blue-600"
                    />
                    <input
                      id={`pf-${meta.key}`}
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={val}
                      onChange={(e) =>
                        setFeatures((prev) => ({ ...prev, [meta.key]: Number(e.target.value) }))
                      }
                      className="w-18 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs font-mono tabular-nums text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{running ? 'Running TensorFlow.js Forward Pass...' : 'Predict Performance'}</span>
          </button>
        </form>

        {/* Right: Result Dashboard */}
        <div className="lg:col-span-6 space-y-5">
          {!result ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
              <Sparkles className="w-7 h-7 text-blue-600 dark:text-blue-400 mx-auto" />
              <h2 className="mt-3 text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Ready for Neural Network Inference
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Adjust the 9 academic indicators or load a student record on the left, then click
                Predict Performance to execute the trained TensorFlow.js model.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                      {result.prediction.studentName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {result.prediction.studentId} · {result.prediction.department} · Model{' '}
                      {result.prediction.modelVersion}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <PerformanceGauge
                    score={result.prediction.predictedScore}
                    lowerBound={result.prediction.uncertaintyBand.lowerBound}
                    upperBound={result.prediction.uncertaintyBand.upperBound}
                    riskCategory={result.prediction.riskCategory}
                    grade={result.prediction.predictedGrade}
                  />

                  <div className="space-y-3 text-xs">
                    <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                      <span className="text-slate-500">Department Average</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {result.benchmarks.departmentAverage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                      <span className="text-slate-500">Delta vs. Department</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          result.benchmarks.deltaFromDepartment >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {result.benchmarks.deltaFromDepartment >= 0 ? '+' : ''}
                        {result.benchmarks.deltaFromDepartment.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                      <span className="text-slate-500">Calibration Coverage</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {result.prediction.uncertaintyBand.calibrationCoveragePct}% empirical
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Uncertainty Method: {result.prediction.uncertaintyBand.method}.
                    </p>
                  </div>
                </div>

                {/* Feature Importance Contribution Breakdown */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Top Feature Contributions &amp; Standardized Signals
                  </h3>
                  <div className="space-y-2">
                    {result.prediction.featureContributions.slice(0, 5).map((fc) => (
                      <div key={fc.feature} className="flex items-center gap-3 text-xs">
                        <span className="w-28 text-slate-600 dark:text-slate-300 truncate">
                          {fc.label}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fc.impactDirection === 'positive'
                                ? 'bg-emerald-600'
                                : fc.impactDirection === 'negative'
                                ? 'bg-red-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, fc.importancePct * 2.5)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {fc.importancePct}% wt
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rule-Based Recommendations */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Recommended Academic Interventions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generated dynamically by the deterministic rule-based advisor engine (separate
                  from the neural network regression model).
                </p>

                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {result.recommendations.recommendations.map((rec) => (
                    <div key={rec.id} className="py-3 first:pt-0 last:pb-0">
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
                          {rec.priority}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
