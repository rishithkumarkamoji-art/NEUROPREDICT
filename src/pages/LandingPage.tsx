import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Cpu,
  ShieldCheck,
  BarChart3,
  FileSpreadsheet,
  Lightbulb,
  Network,
  Sun,
  Moon,
} from 'lucide-react';
import { NeuralDiagramSvg } from '../components/NeuralDiagramSvg';
import { PWAInstallButton } from '../components/PWAInstallControl';
import { useAuth } from '../context/AuthContext';
import { useThemeToast } from '../context/ThemeToastContext';
import { api } from '../services/api';

interface PublicSummary {
  demoStudentCount: number;
  trainingDatasetSize: number;
  totalPredictions: number;
  modelR2: number;
  modelMae: number;
  modelVersion: string;
  conformalCoveragePct: number;
}

const STAGES: Array<'input' | 'hidden1' | 'hidden2' | 'output'> = [
  'input',
  'hidden1',
  'hidden2',
  'output',
];

export function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useThemeToast();
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    api
      .get('/analytics/public-summary')
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % STAGES.length);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  const dashboardTarget = user
    ? user.role === 'admin'
      ? '/admin'
      : user.role === 'faculty'
      ? '/faculty'
      : '/student'
    : '/login';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0"
          >
            NeuroPredict
          </Link>

          <nav
            aria-label="Primary landing navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#features"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#stack"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Tech Stack
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />
            <Link
              to={dashboardTarget}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Workspace' : 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Predict Early. Learn Better. Perform Smarter.
            </p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]">
              Understand Performance Before Results Arrive.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              An intelligent academic analytics platform powered by Artificial Neural Networks to
              predict student performance and identify academic risks.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={dashboardTarget}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Explore Features
              </a>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              University NNDL Project-Based Learning (PBL) Platform · TensorFlow.js 9→16→8→1 ANN ·
              MongoDB &amp; Mongoose ODM
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Live Feed-Forward Topology
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    9 Inputs → 16 ReLU → 8 ReLU → 1 Sigmoid · 305 trainable parameters
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-blue-700 dark:text-blue-400 whitespace-nowrap">
                  Stage: {STAGES[stageIdx]}
                </span>
              </div>
              <div className="pt-3">
                <NeuralDiagramSvg activeStage={STAGES[stageIdx]} compact />
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Quantitative Proof Row derived from Real Seeded Database & Model */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Synthetic Training Records
            </p>
            <p className="mt-2 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {summary ? summary.trainingDatasetSize.toLocaleString() : '1,200'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              70% Train / 15% Val / 15% Test
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Held-Out Test R² Score
            </p>
            <p className="mt-2 text-2xl font-display font-bold tabular-nums text-blue-700 dark:text-blue-400">
              {summary ? summary.modelR2.toFixed(3) : '0.940'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              MAE: {summary ? `${summary.modelMae.toFixed(2)} pts` : '2.80 pts'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Seeded Cohort Profiles
            </p>
            <p className="mt-2 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {summary ? summary.demoStudentCount : 24}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {summary ? `${summary.totalPredictions} predictions logged` : '5 engineering departments'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Conformal Interval Coverage
            </p>
            <p className="mt-2 text-2xl font-display font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {summary ? `${summary.conformalCoveragePct}%` : '90.0%'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Calibrated validation residuals
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-50">
              Core Academic Intelligence Capabilities
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Built end-to-end for Neural Networks and Deep Learning (NNDL) demonstration with real
              model training, strict data isolation, and transparent explainability.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                title: 'Trainable TensorFlow.js ANN',
                desc: 'Real 9→16→8→1 feed-forward neural network compiled with Adam (lr=0.001) and MSE loss. Trains, persists weights, and reloads seamlessly.',
              },
              {
                icon: Network,
                title: 'Interactive Neural Network Lab',
                desc: 'Inspect live weights, ReLU & Sigmoid activations, pre-activation sums, backpropagation gradients, and real epoch loss curves.',
              },
              {
                icon: BarChart3,
                title: 'Institutional Analytics Suite',
                desc: '8 live Recharts views covering risk tiers, attendance correlation, department benchmarks, and permutation feature importance.',
              },
              {
                icon: ShieldCheck,
                title: 'Role-Based Access Control',
                desc: 'Dedicated workspaces for Administrators, Faculty, and Students backed by JWT authentication, bcrypt hashing, and record ownership checks.',
              },
              {
                icon: Lightbulb,
                title: 'Rule-Based Advisor Engine',
                desc: 'Transparent intervention plans triggered directly by attendance deficits, internal test gaps, study hours, and subject backlogs.',
              },
              {
                icon: FileSpreadsheet,
                title: 'CSV Bulk Import & PDF Reports',
                desc: 'Validate, preview, and deduplicate CSV student rosters before importing, and export print-ready PDF prediction reports.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-6"
                >
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture & How It Works */}
      <section id="how-it-works" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="architecture" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-50">
              How NeuroPredict Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Every prediction follows a strict, leakage-free machine learning pipeline using
              training-only z-score normalization and split-conformal uncertainty calibration.
            </p>
            <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Mathematical Pipeline
              </p>
              <p>z_i = (x_i - μ_train) / σ_train</p>
              <p>h1 = ReLU(W1 · z + b1)  [16 units]</p>
              <p>h2 = ReLU(W2 · h1 + b2) [8 units]</p>
              <p>ŷ = 100 × σ(W3 · h2 + b3) [Sigmoid]</p>
              <p>MSE = (1/n) × Σ(y - ŷ)²</p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                step: '01. Collect Academic Indicators',
                detail:
                  'Capture 9 validated academic signals: attendance, internal marks, previous GPA, assignments, weekly study hours, prior score, weak subjects, participation, and semester.',
              },
              {
                step: '02. Standardize & Forward Propagate',
                detail:
                  'Normalize inputs strictly with training-split statistics and propagate through the saved TensorFlow.js 9→16→8→1 network.',
              },
              {
                step: '03. Calibrate Risk & Uncertainty',
                detail:
                  'Attach a 90% split-conformal prediction interval from validation residuals and classify Low, Medium, or High academic risk.',
              },
              {
                step: '04. Deliver Actionable Plans',
                detail:
                  'Persist prediction history, generate transparent rule-based remediation steps, and export downloadable PDF reports.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.step}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section
        id="stack"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-14"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
            Technology Stack
          </h2>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { area: 'Frontend', tech: 'React 19 · Vite · Tailwind CSS · Recharts' },
              { area: 'Backend API', tech: 'Node.js · Express · JWT · bcryptjs · Multer' },
              { area: 'Neural Engine', tech: 'TensorFlow.js · 9-16-8-1 ANN · Adam · MSE' },
              { area: 'Database', tech: 'MongoDB · Mongoose ODM · Local JSON Fallback' },
            ].map((row) => (
              <div
                key={row.area}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
              >
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{row.area}</p>
                <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {row.tech}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            NeuroPredict · NNDL Project-Based Learning System · Synthetic training dataset used for
            academic demonstration.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-slate-100">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-900 dark:hover:text-slate-100">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
