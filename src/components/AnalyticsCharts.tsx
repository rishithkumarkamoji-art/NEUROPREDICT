import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import type {
  ActualVsPredictedPoint,
  EpochMetric,
  FeatureImportanceItem,
} from '../../shared/types';

const GRID_COLOR = 'rgba(148, 163, 184, 0.2)';
const AXIS_TICK = { fontSize: 11, fill: '#64748B' };

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="w-full h-64 min-h-[256px]">{children}</div>
    </div>
  );
}

export function PerformanceDistributionChart({
  data,
}: {
  data: { range: string; label: string; count: number }[];
}) {
  return (
    <ChartCard
      title="Student Performance Distribution"
      subtitle="Count of students across predicted score bands"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="range" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Students" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AttendanceVsScoreChart({
  data,
}: {
  data: { name: string; attendance: number; predictedScore: number; riskCategory: string }[];
}) {
  const low = data.filter((d) => d.riskCategory === 'Low Risk');
  const med = data.filter((d) => d.riskCategory === 'Medium Risk');
  const high = data.filter((d) => d.riskCategory === 'High Risk');

  return (
    <ChartCard
      title="Attendance vs. Predicted Score"
      subtitle="Relationship between class attendance (%) and ANN predicted outcome"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="attendance"
            name="Attendance"
            unit="%"
            domain={[35, 100]}
            tick={AXIS_TICK}
          />
          <YAxis
            type="number"
            dataKey="predictedScore"
            name="Predicted Score"
            unit="%"
            domain={[20, 100]}
            tick={AXIS_TICK}
          />
          <ZAxis range={[48, 48]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter name="Low Risk" data={low} fill="#059669" />
          <Scatter name="Medium Risk" data={med} fill="#D97706" />
          <Scatter name="High Risk" data={high} fill="#DC2626" />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RiskDistributionChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <ChartCard
      title="Academic Risk Distribution"
      subtitle="Students grouped by configurable institutional risk thresholds"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={86}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DepartmentPerformanceChart({
  data,
}: {
  data: { shortName: string; department: string; avgScore: number; avgAttendance: number }[];
}) {
  return (
    <ChartCard
      title="Department-Wise Performance"
      subtitle="Average predicted score and attendance across engineering departments"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="shortName" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.department || ''}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="avgScore" name="Avg Score (%)" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar
            dataKey="avgAttendance"
            name="Avg Attendance (%)"
            fill="#64748B"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MonthlyProgressChart({
  data,
}: {
  data: { month: string; avgScore: number; avgAttendance: number }[];
}) {
  return (
    <ChartCard
      title="Monthly Academic Progress"
      subtitle="Cohort-wide average score and attendance trend over the last 6 months"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis domain={[40, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="avgScore"
            name="Avg Score (%)"
            stroke="#2563EB"
            fill="rgba(37, 99, 235, 0.14)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="avgAttendance"
            name="Avg Attendance (%)"
            stroke="#059669"
            fill="rgba(5, 150, 105, 0.10)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TrainingLossChart({ data }: { data: EpochMetric[] }) {
  return (
    <ChartCard
      title="Training Loss vs. Epochs (MSE)"
      subtitle="Measured Mean Squared Error reduction during TensorFlow.js training"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="epoch" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="loss"
            name="Training MSE"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ValidationLossChart({ data }: { data: EpochMetric[] }) {
  return (
    <ChartCard
      title="Validation Loss & MAE vs. Epochs"
      subtitle="Held-out validation generalization curves monitoring overfitting"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="epoch" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="valLoss"
            name="Validation MSE"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="loss"
            name="Training MSE"
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ActualVsPredictedChart({ data }: { data: ActualVsPredictedPoint[] }) {
  return (
    <ChartCard
      title="Actual vs. Predicted Scores (Test Set)"
      subtitle="Held-out synthetic test records plotted against the ideal y = x reference line"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual"
            unit="%"
            domain={[15, 100]}
            tick={AXIS_TICK}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Predicted"
            unit="%"
            domain={[15, 100]}
            tick={AXIS_TICK}
          />
          <ZAxis range={[36, 36]} />
          <ReferenceLine
            segment={[
              { x: 15, y: 15 },
              { x: 100, y: 100 },
            ]}
            stroke="#94A3B8"
            strokeDasharray="4 4"
          />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Scatter name="Test Sample" data={data} fill="#2563EB" fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FeatureImportanceChart({ data }: { data: FeatureImportanceItem[] }) {
  return (
    <ChartCard
      title="Permutation Feature Importance"
      subtitle="Measured test-set MAE sensitivity (%) across all 9 neural network inputs"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 6, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
          <XAxis type="number" unit="%" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={108}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(val, _name, item) => [
              `${val ?? 0}% (+${item?.payload?.maeDelta ?? 0} MAE pts)`,
              'Importance',
            ]}
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          />
          <Bar dataKey="importance" name="Importance" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
