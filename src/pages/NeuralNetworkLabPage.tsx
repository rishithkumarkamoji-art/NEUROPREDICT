import React, { useCallback, useEffect, useState } from 'react';
import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';
import { FEATURE_METADATA } from '../../shared/academicRules';
import type {
  AcademicFeatures,
  ForwardPassInspection,
  ModelTrainingRecord,
} from '../../shared/types';
import { TrainingLossChart, ValidationLossChart } from '../components/AnalyticsCharts';
import { NeuralDiagramSvg, type SelectedNeuron } from '../components/NeuralDiagramSvg';
import { LoadingSkeleton, SectionHeader } from '../components/UiPrimitives';
import { api } from '../services/api';

const PLAYBACK_STAGES: Array<{
  key: 'input' | 'hidden1' | 'hidden2' | 'output' | 'backprop';
  label: string;
  explanation: string;
}> = [
  {
    key: 'input',
    label: '1. Input Standardization',
    explanation:
      'Raw academic features are z-score standardized using training-split statistics: z_i = (x_i - μ_train) / σ_train to prevent large-scale features from dominating gradients.',
  },
  {
    key: 'hidden1',
    label: '2. Hidden Layer 1 (16 ReLU)',
    explanation:
      'Each of the 16 neurons computes z = Σ(w_ij · x_i) + b_j and applies ReLU(z) = max(0, z), learning nonlinear interactions between attendance, internal marks, and study habits.',
  },
  {
    key: 'hidden2',
    label: '3. Hidden Layer 2 (8 ReLU)',
    explanation:
      'Compresses the 16 intermediate signals into 8 high-level academic representations (e.g., consistency factor, exam readiness, backlog drag) via ReLU activations.',
  },
  {
    key: 'output',
    label: '4. Output Layer (1 Sigmoid)',
    explanation:
      'Maps the final weighted sum through Sigmoid σ(z) = 1 / (1 + e^-z) ∈ (0, 1), then scales by 100 to yield the bounded predicted academic percentage.',
  },
  {
    key: 'backprop',
    label: '5. Backpropagation & Adam',
    explanation:
      'During training, Mean Squared Error loss MSE = (1/n)Σ(y - ŷ)² is differentiated right-to-left using the chain rule; Adam (lr = 0.001) updates all 305 weights and biases.',
  },
];

const GLOSSARY = [
  {
    term: 'Neurons & Layers',
    detail:
      'Computational units organized into an Input Layer (9), two Hidden Layers (16 & 8), and an Output Layer (1). Total trainable parameters: 9×16+16 + 16×8+8 + 8×1+1 = 305.',
  },
  {
    term: 'Weights & Biases',
    detail:
      'Weights (W) scale the influence of incoming signals; Biases (b) shift each neuron’s activation threshold so it can fire even when inputs are centered around zero.',
  },
  {
    term: 'ReLU Activation',
    detail:
      'f(x) = max(0, x). Introduces nonlinearity while mitigating vanishing gradients in hidden layers and enabling sparse, computationally fast representations.',
  },
  {
    term: 'Sigmoid Activation',
    detail:
      'f(x) = 1 / (1 + e^-x). Smoothly squashes any real number into (0, 1), ideal for normalized academic score targets scaled to 0–100%.',
  },
  {
    term: 'Loss Function (MSE)',
    detail:
      'MSE = (1/n) × Σ(y - ŷ)². Penalizes larger prediction errors quadratically, driving the network to minimize severe misclassifications of at-risk students.',
  },
  {
    term: 'Gradient Descent & Backpropagation',
    detail:
      'Backpropagation applies the multivariable chain rule to compute ∂Loss/∂W for every weight; Gradient Descent steps opposite the gradient to descend the error surface.',
  },
  {
    term: 'Adam Optimizer & Learning Rate',
    detail:
      'Adaptive Moment Estimation combines momentum and RMSProp per-parameter scaling at learning rate α = 0.001 for fast, stable convergence without manual schedule tuning.',
  },
];

export function NeuralNetworkLabPage() {
  const [features, setFeatures] = useState<AcademicFeatures>({
    attendance: 84,
    internalMarks: 78,
    previousGPA: 8.1,
    assignmentCompletion: 86,
    weeklyStudyHours: 19,
    previousPerformance: 80,
    subjectsNeedingImprovement: 0,
    participationScore: 80,
    semester: 6,
  });

  const [inspection, setInspection] = useState<ForwardPassInspection | null>(null);
  const [modelMeta, setModelMeta] = useState<ModelTrainingRecord | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedNeuron, setSelectedNeuron] = useState<SelectedNeuron | null>({
    layer: 'output',
    index: 0,
  });
  const [mathProbeX, setMathProbeX] = useState(1.2);
  const [mseActual, setMseActual] = useState(82);
  const [msePred, setMsePred] = useState(78);
  const [loading, setLoading] = useState(true);

  const runInspection = useCallback(async (f: AcademicFeatures) => {
    try {
      const res = await api.post('/model/inspect', f);
      setInspection(res.data.inspection);
    } catch {
      // handled gracefully
    }
  }, []);

  useEffect(() => {
    Promise.all([api.get('/model/metrics'), api.post('/model/inspect', features)])
      .then(([metricsRes, inspectRes]) => {
        setModelMeta(metricsRes.data.latest ?? null);
        setInspection(inspectRes.data.inspection ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runInspection(features);
    }, 180);
    return () => clearTimeout(timer);
  }, [features, runInspection]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % PLAYBACK_STAGES.length);
    }, 1700);
    return () => clearInterval(id);
  }, [playing]);

  if (loading) return <LoadingSkeleton />;

  const activeStage = PLAYBACK_STAGES[stageIdx];
  const reluVal = Math.max(0, mathProbeX);
  const sigmoidVal = 1 / (1 + Math.exp(-mathProbeX));
  const squaredError = Math.pow((mseActual - msePred) / 100, 2);

  const renderNeuronDetails = () => {
    if (!inspection || !selectedNeuron) return null;
    if (selectedNeuron.layer === 'input') {
      const n = inspection.inputs[selectedNeuron.index];
      return (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Input Node x{selectedNeuron.index + 1}: {n.label}
          </p>
          <p className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            Raw Value: {n.raw} · Standardized z-score: {n.normalized}
          </p>
        </div>
      );
    }
    if (selectedNeuron.layer === 'hidden1') {
      const n = inspection.hidden1[selectedNeuron.index];
      return (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Hidden Layer 1 · Neuron h₁,{selectedNeuron.index + 1} (ReLU)
          </p>
          <p className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            Bias b = {n.bias} · Pre-activation z = {n.preActivation} · ReLU(z) = {n.activation}
          </p>
        </div>
      );
    }
    if (selectedNeuron.layer === 'hidden2') {
      const n = inspection.hidden2[selectedNeuron.index];
      return (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Hidden Layer 2 · Neuron h₂,{selectedNeuron.index + 1} (ReLU)
          </p>
          <p className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
            Bias b = {n.bias} · Pre-activation z = {n.preActivation} · ReLU(z) = {n.activation}
          </p>
        </div>
      );
    }
    return (
      <div className="text-xs space-y-1">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          Output Layer · Neuron ŷ (Sigmoid)
        </p>
        <p className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
          Bias b = {inspection.output.bias} · z = {inspection.output.preActivation} · σ(z) ={' '}
          {inspection.output.sigmoid} · Score = {inspection.output.predictedScore.toFixed(2)}%
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Neural Network Visualization Lab"
        description="Interactive sandbox inspecting the real trained TensorFlow.js weights, biases, forward-pass activations, activation functions, and epoch loss metrics."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{playing ? 'Pause Signal' : 'Animate Flow'}</span>
            </button>
            <button
              type="button"
              onClick={() => setStageIdx((prev) => (prev + 1) % PLAYBACK_STAGES.length)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 whitespace-nowrap"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setStageIdx(0);
              }}
              aria-label="Reset lab stage"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Two-Zone Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Network Stage (65%) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Active Model Topology ({inspection?.modelVersion ?? 'v1.0'}) · 305 Trainable
                Parameters
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any neuron to inspect its exact pre-activation sum, bias, and output.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {PLAYBACK_STAGES.map((st, idx) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStageIdx(idx);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    stageIdx === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st.label.split('.')[0]}
                </button>
              ))}
            </div>
          </div>

          <NeuralDiagramSvg
            inspection={inspection}
            activeStage={activeStage.key}
            selectedNeuron={selectedNeuron}
            onSelectNeuron={setSelectedNeuron}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                {activeStage.label}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStage.explanation}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
              {renderNeuronDetails()}
            </div>
          </div>
        </div>

        {/* Right: Live Input Sliders Control Deck (35%) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5">
          <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Input Signal Sliders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag any slider to watch hidden layer ReLU activations and output score recompute in
              real time.
            </p>
          </div>

          {FEATURE_METADATA.map((meta) => (
            <div key={meta.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <label htmlFor={`lab-${meta.key}`} className="text-slate-700 dark:text-slate-300">
                  {meta.shortLabel}
                </label>
                <span className="font-mono tabular-nums font-medium text-blue-700 dark:text-blue-400">
                  {features[meta.key]} {meta.unit}
                </span>
              </div>
              <input
                id={`lab-${meta.key}`}
                type="range"
                min={meta.min}
                max={meta.max}
                step={meta.step}
                value={features[meta.key]}
                onChange={(e) =>
                  setFeatures((prev) => ({ ...prev, [meta.key]: Number(e.target.value) }))
                }
                className="w-full accent-blue-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Mathematical Explorers: ReLU, Sigmoid, MSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            ReLU Activation Function
          </h3>
          <p className="font-mono text-sm text-blue-700 dark:text-blue-400">f(x) = max(0, x)</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Used in Hidden Layers 1 (16 neurons) and 2 (8 neurons). Zeroes out negative weighted
            sums while passing positive activations linearly.
          </p>
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs font-mono tabular-nums">
              <label htmlFor="probe-relu">Input x = {mathProbeX.toFixed(2)}</label>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ReLU(x) = {reluVal.toFixed(3)}
              </span>
            </div>
            <input
              id="probe-relu"
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={mathProbeX}
              onChange={(e) => setMathProbeX(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Sigmoid Output Activation
          </h3>
          <p className="font-mono text-sm text-blue-700 dark:text-blue-400">
            f(x) = 1 / (1 + e⁻ˣ)
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Used in the Output Layer to guarantee bounded predictions between 0 and 1, which scale
            cleanly to 0–100% academic scores.
          </p>
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs font-mono tabular-nums">
              <label htmlFor="probe-sig">Input x = {mathProbeX.toFixed(2)}</label>
              <span className="text-indigo-700 dark:text-indigo-400 font-semibold">
                σ(x) = {sigmoidVal.toFixed(4)} ({(sigmoidVal * 100).toFixed(1)}%)
              </span>
            </div>
            <input
              id="probe-sig"
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={mathProbeX}
              onChange={(e) => setMathProbeX(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Mean Squared Error (MSE) Loss
          </h3>
          <p className="font-mono text-sm text-blue-700 dark:text-blue-400">
            MSE = (1/n) × Σ(y - ŷ)²
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Measures squared residual between normalized actual score y and predicted score ŷ.
          </p>
          <div className="pt-1 space-y-2 text-xs font-mono tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="mse-y">Actual y: {mseActual}%</label>
              <input
                id="mse-y"
                type="range"
                min={10}
                max={100}
                value={mseActual}
                onChange={(e) => setMseActual(Number(e.target.value))}
                className="w-32 accent-blue-600"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="mse-yhat">Pred ŷ: {msePred}%</label>
              <input
                id="mse-yhat"
                type="range"
                min={10}
                max={100}
                value={msePred}
                onChange={(e) => setMsePred(Number(e.target.value))}
                className="w-32 accent-indigo-600"
              />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-semibold">
              Sample Loss: {squaredError.toFixed(6)} · |Error|: {Math.abs(mseActual - msePred)}%
            </p>
          </div>
        </div>
      </div>

      {/* Real Epoch Loss Reduction Charts */}
      {modelMeta && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrainingLossChart data={modelMeta.epochHistory} />
          <ValidationLossChart data={modelMeta.epochHistory} />
        </div>
      )}

      {/* NNDL Concept Glossary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
          Neural Networks &amp; Deep Learning Concept Guide
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GLOSSARY.map((item) => (
            <div key={item.term} className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.term}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
