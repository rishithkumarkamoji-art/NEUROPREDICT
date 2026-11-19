import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import type { ModelTrainingRecord } from '../../shared/types';
import {
  ActualVsPredictedChart,
  FeatureImportanceChart,
  TrainingLossChart,
  ValidationLossChart,
} from '../components/AnalyticsCharts';
import {
  ErrorState,
  LoadingSkeleton,
  SectionHeader,
  StatCard,
} from '../components/UiPrimitives';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

export function ModelTrainingPage() {
  const { user } = useAuth();
  const { notify } = useThemeToast();

  const [latest, setLatest] = useState<ModelTrainingRecord | null>(null);
  const [history, setHistory] = useState<ModelTrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [training, setTraining] = useState(false);

  const [epochs, setEpochs] = useState(35);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [datasetSize, setDatasetSize] = useState(1200);
  const [seed, setSeed] = useState(20260417);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/model/metrics');
      setLatest(res.data.latest ?? null);
      setHistory(res.data.history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load model metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTraining(true);
    try {
      const res = await api.post('/model/train', {
        epochs,
        batchSize,
        learningRate,
        datasetSize,
        seed,
      });
      const rec: ModelTrainingRecord = res.data.training;
      notify(
        'success',
        `Trained Model ${rec.modelVersion}`,
        `Test R²: ${rec.testMetrics.r2.toFixed(4)} · MAE: ${rec.testMetrics.mae.toFixed(2)} pts in ${(rec.durationMs / 1000).toFixed(1)}s.`
      );
      await loadMetrics();
    } catch (err) {
      notify('error', 'Training failed', err instanceof Error ? err.message : undefined);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Model Training & Evaluation Dashboard"
        description="Configure hyperparameters, retrain the TensorFlow.js 9→16→8→1 neural network on deterministic synthetic data, and inspect real held-out test metrics."
        actions={
          <button
            type="button"
            onClick={loadMetrics}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {loading && <LoadingSkeleton />}
      {!loading && error && <ErrorState message={error} onRetry={loadMetrics} />}

      {!loading && latest && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Active Version"
              value={latest.modelVersion}
              subtext={`${latest.architecture.totalParameters} trainable params`}
            />
            <StatCard
              label="Test Set R²"
              value={latest.testMetrics.r2.toFixed(4)}
              tone="blue"
              subtext={`Held-out N = ${latest.testSplitSize}`}
            />
            <StatCard
              label="Test MAE / RMSE"
              value={`${latest.testMetrics.mae.toFixed(2)} / ${latest.testMetrics.rmse.toFixed(2)}`}
              subtext="Percentage points"
            />
            <StatCard
              label="Final Val MSE"
              value={latest.validationLoss.toFixed(5)}
              subtext={`Train MSE: ${latest.trainingLoss.toFixed(5)}`}
            />
            <StatCard
              label="90% Conformal Band"
              value={`±${latest.testMetrics.conformalHalfWidth.toFixed(2)}`}
              tone="emerald"
              subtext={`${latest.testMetrics.empiricalCoveragePct}% empirical coverage`}
            />
          </div>

          {/* Retraining Panel (Admin interactive, Faculty read-only note) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Retrain Neural Network Pipeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Uses training-only z-score normalization (70/15/15 split), saves weights to disk,
                  and swaps the live model atomically.
                </p>
              </div>
              {user?.role !== 'admin' && (
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Administrator role required to trigger retraining
                </span>
              )}
            </div>

            <form
              onSubmit={handleTrain}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
            >
              <div>
                <label htmlFor="tr-epochs" className="block text-xs font-medium text-slate-500 mb-1">
                  Epochs (5–120)
                </label>
                <input
                  id="tr-epochs"
                  type="number"
                  min={5}
                  max={120}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="tr-batch" className="block text-xs font-medium text-slate-500 mb-1">
                  Batch Size
                </label>
                <select
                  id="tr-batch"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                >
                  {[16, 32, 64].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tr-lr" className="block text-xs font-medium text-slate-500 mb-1">
                  Adam Learning Rate
                </label>
                <select
                  id="tr-lr"
                  value={learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                >
                  {[0.0005, 0.001, 0.002, 0.005].map((lr) => (
                    <option key={lr} value={lr}>
                      {lr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tr-size" className="block text-xs font-medium text-slate-500 mb-1">
                  Dataset Records
                </label>
                <select
                  id="tr-size"
                  value={datasetSize}
                  onChange={(e) => setDatasetSize(Number(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                >
                  {[1000, 1200, 1600, 2000].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tr-seed" className="block text-xs font-medium text-slate-500 mb-1">
                  PRNG Seed
                </label>
                <input
                  id="tr-seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  disabled={user?.role !== 'admin'}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
              <button
                type="submit"
                disabled={training || user?.role !== 'admin'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white whitespace-nowrap"
              >
                <Cpu className="w-4 h-4" />
                <span>{training ? 'Training ANN...' : 'Train New Version'}</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TrainingLossChart data={latest.epochHistory} />
            <ValidationLossChart data={latest.epochHistory} />
            <ActualVsPredictedChart data={latest.actualVsPredicted} />
            <FeatureImportanceChart data={latest.featureImportance} />
          </div>

          {/* Training History Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Model Training Version History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500">
                    <th className="py-3 px-4 font-medium">Version</th>
                    <th className="py-3 px-4 font-medium">Dataset</th>
                    <th className="py-3 px-4 font-medium">Hyperparameters</th>
                    <th className="py-3 px-4 font-medium text-right">Val Loss</th>
                    <th className="py-3 px-4 font-medium text-right">Test MAE</th>
                    <th className="py-3 px-4 font-medium text-right">Test R²</th>
                    <th className="py-3 px-4 font-medium text-right">Duration</th>
                    <th className="py-3 px-4 font-medium">Trained At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((run) => (
                    <tr key={run.id}>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {run.modelVersion}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">{run.datasetSize} rows</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {run.epochs} ep · bs {run.batchSize} · lr {run.learningRate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {run.validationLoss.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {run.testMetrics.mae.toFixed(2)} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                        {run.testMetrics.r2.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {(run.durationMs / 1000).toFixed(1)}s
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(run.trainingDate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
