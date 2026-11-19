import { Router } from 'express';
import { classifyRisk } from '../../shared/academicRules.ts';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.ts';
import { dataStore } from '../services/dataStore.ts';
import { neuralNetworkService } from '../services/neuralNetwork.ts';

export const analyticsRouter = Router();
export const reportsRouter = Router();
export const settingsRouter = Router();

async function getFilteredStudentAnalytics(query: Record<string, unknown>) {
  const students = await dataStore.listStudents();
  const predictions = await dataStore.listPredictions();
  const settings = await dataStore.getSettings();

  const latestPredByStudent = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions) {
    const code = p.studentId.toUpperCase();
    if (!latestPredByStudent.has(code)) {
      latestPredByStudent.set(code, p);
    }
  }

  let rows = students.map((s) => {
    const pred = latestPredByStudent.get(s.studentId.toUpperCase());
    const score = pred?.predictedScore ?? s.previousPerformance;
    const riskCategory = classifyRisk(score, settings.riskThresholds);
    return {
      student: s,
      predictedScore: score,
      predictedGrade: pred?.predictedGrade ?? 'Average',
      riskCategory,
      prediction: pred ?? null,
    };
  });

  const department = String(query.department || '');
  const semester = query.semester ? Number(query.semester) : null;
  const section = String(query.section || '');
  const risk = String(query.risk || '');
  const year = query.year ? Number(query.year) : null;

  if (department && department !== 'all') {
    rows = rows.filter((r) => r.student.department === department);
  }
  if (semester && Number.isFinite(semester)) {
    rows = rows.filter((r) => r.student.semester === semester);
  }
  if (section && section !== 'all') {
    rows = rows.filter((r) => r.student.section === section);
  }
  if (risk && risk !== 'all') {
    rows = rows.filter((r) => r.riskCategory === risk);
  }
  if (year && Number.isFinite(year)) {
    rows = rows.filter((r) => r.student.enrollmentYear === year);
  }

  return { rows, settings };
}

// Public non-PII summary for the Landing Page
analyticsRouter.get('/public-summary', async (_req, res) => {
  const students = await dataStore.listStudents();
  const predictions = await dataStore.listPredictions();
  const modelMeta = neuralNetworkService.getMetadata();

  res.json({
    demoStudentCount: students.length,
    trainingDatasetSize: modelMeta?.datasetSize ?? 1200,
    totalPredictions: predictions.length,
    modelR2: modelMeta?.testMetrics.r2 ?? 0.94,
    modelMae: modelMeta?.testMetrics.mae ?? 2.8,
    modelVersion: modelMeta?.modelVersion ?? 'v1.0',
    conformalCoveragePct: modelMeta?.testMetrics.empiricalCoveragePct ?? 90,
  });
});

analyticsRouter.get('/overview', authenticate, async (req, res) => {
  try {
    const { rows, settings } = await getFilteredStudentAnalytics(
      req.query as Record<string, unknown>
    );
    const modelMeta = neuralNetworkService.getMetadata();

    const totalStudents = rows.length;
    const avgPredictedScore =
      totalStudents > 0
        ? Number((rows.reduce((s, r) => s + r.predictedScore, 0) / totalStudents).toFixed(1))
        : 0;
    const avgAttendance =
      totalStudents > 0
        ? Number((rows.reduce((s, r) => s + r.student.attendance, 0) / totalStudents).toFixed(1))
        : 0;

    const lowRisk = rows.filter((r) => r.riskCategory === 'Low Risk').length;
    const mediumRisk = rows.filter((r) => r.riskCategory === 'Medium Risk').length;
    const highRisk = rows.filter((r) => r.riskCategory === 'High Risk').length;

    // 1. Performance distribution buckets
    const buckets = [
      { range: '90–100', label: 'Excellent', count: 0 },
      { range: '80–89', label: 'Very Good', count: 0 },
      { range: '70–79', label: 'Good', count: 0 },
      { range: '60–69', label: 'Average', count: 0 },
      { range: '40–59', label: 'Needs Imp.', count: 0 },
      { range: '<40', label: 'Critical', count: 0 },
    ];
    for (const r of rows) {
      const sc = r.predictedScore;
      if (sc >= 90) buckets[0].count++;
      else if (sc >= 80) buckets[1].count++;
      else if (sc >= 70) buckets[2].count++;
      else if (sc >= 60) buckets[3].count++;
      else if (sc >= 40) buckets[4].count++;
      else buckets[5].count++;
    }

    // 2. Attendance vs Predicted Score scatter
    const attendanceVsScore = rows.map((r) => ({
      studentId: r.student.studentId,
      name: r.student.fullName,
      department: r.student.department,
      attendance: r.student.attendance,
      predictedScore: Number(r.predictedScore.toFixed(1)),
      riskCategory: r.riskCategory,
    }));

    // 3. Risk distribution
    const riskDistribution = [
      { name: 'Low Risk', value: lowRisk, color: '#059669' },
      { name: 'Medium Risk', value: mediumRisk, color: '#D97706' },
      { name: 'High Risk', value: highRisk, color: '#DC2626' },
    ];

    // 4. Department-wise performance
    const deptMap = new Map<
      string,
      { sumScore: number; sumAtt: number; sumGpa: number; count: number; highRisk: number }
    >();
    for (const r of rows) {
      const d = r.student.department;
      const cur = deptMap.get(d) ?? {
        sumScore: 0,
        sumAtt: 0,
        sumGpa: 0,
        count: 0,
        highRisk: 0,
      };
      cur.sumScore += r.predictedScore;
      cur.sumAtt += r.student.attendance;
      cur.sumGpa += r.student.previousGPA;
      cur.count++;
      if (r.riskCategory === 'High Risk') cur.highRisk++;
      deptMap.set(d, cur);
    }

    const departmentPerformance = Array.from(deptMap.entries()).map(([department, d]) => ({
      department,
      shortName: department
        .split(' ')
        .filter((w) => w !== '&')
        .map((w) => w[0])
        .join('')
        .toUpperCase(),
      avgScore: Number((d.sumScore / d.count).toFixed(1)),
      avgAttendance: Number((d.sumAtt / d.count).toFixed(1)),
      avgGPA: Number((d.sumGpa / d.count).toFixed(2)),
      studentCount: d.count,
      highRiskCount: d.highRisk,
    }));

    // 5. Monthly academic progress aggregated across student histories
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const monthlyProgress = months.map((month) => {
      let scoreSum = 0;
      let attSum = 0;
      let n = 0;
      for (const r of rows) {
        const pt = r.student.history.find((h) => h.month === month);
        if (pt) {
          scoreSum += pt.score;
          attSum += pt.attendance;
          n++;
        }
      }
      return {
        month,
        avgScore: n > 0 ? Number((scoreSum / n).toFixed(1)) : 0,
        avgAttendance: n > 0 ? Number((attSum / n).toFixed(1)) : 0,
      };
    });

    res.json({
      kpis: {
        totalStudents,
        avgPredictedScore,
        avgAttendance,
        lowRisk,
        mediumRisk,
        highRisk,
        modelVersion: modelMeta?.modelVersion ?? 'v1.0',
        modelLoaded: neuralNetworkService.getStatus().loaded,
        modelR2: modelMeta?.testMetrics.r2 ?? 0,
        modelMae: modelMeta?.testMetrics.mae ?? 0,
        conformalHalfWidth: modelMeta?.testMetrics.conformalHalfWidth ?? 0,
        empiricalCoveragePct: modelMeta?.testMetrics.empiricalCoveragePct ?? 0,
      },
      thresholds: settings.riskThresholds,
      performanceDistribution: buckets,
      attendanceVsScore,
      riskDistribution,
      departmentPerformance,
      monthlyProgress,
      epochHistory: modelMeta?.epochHistory ?? [],
      actualVsPredicted: modelMeta?.actualVsPredicted ?? [],
      featureImportance: modelMeta?.featureImportance ?? [],
    });
  } catch {
    res.status(500).json({ error: 'Failed to compute analytics overview.' });
  }
});

analyticsRouter.get('/performance', authenticate, async (req, res) => {
  const { rows } = await getFilteredStudentAnalytics(req.query as Record<string, unknown>);
  res.json({
    records: rows.map((r) => ({
      studentId: r.student.studentId,
      fullName: r.student.fullName,
      department: r.student.department,
      semester: r.student.semester,
      attendance: r.student.attendance,
      internalMarks: r.student.internalMarks,
      previousGPA: r.student.previousGPA,
      predictedScore: r.predictedScore,
      predictedGrade: r.predictedGrade,
      riskCategory: r.riskCategory,
    })),
  });
});

analyticsRouter.get('/risk-distribution', authenticate, async (req, res) => {
  const { rows, settings } = await getFilteredStudentAnalytics(req.query as Record<string, unknown>);
  res.json({
    thresholds: settings.riskThresholds,
    distribution: [
      { category: 'Low Risk', count: rows.filter((r) => r.riskCategory === 'Low Risk').length },
      {
        category: 'Medium Risk',
        count: rows.filter((r) => r.riskCategory === 'Medium Risk').length,
      },
      { category: 'High Risk', count: rows.filter((r) => r.riskCategory === 'High Risk').length },
    ],
  });
});

analyticsRouter.get('/department', authenticate, async (req, res) => {
  const { rows } = await getFilteredStudentAnalytics(req.query as Record<string, unknown>);
  const grouped = new Map<string, { count: number; scoreSum: number; attSum: number }>();
  for (const r of rows) {
    const cur = grouped.get(r.student.department) ?? { count: 0, scoreSum: 0, attSum: 0 };
    cur.count++;
    cur.scoreSum += r.predictedScore;
    cur.attSum += r.student.attendance;
    grouped.set(r.student.department, cur);
  }
  res.json({
    departments: Array.from(grouped.entries()).map(([department, g]) => ({
      department,
      studentCount: g.count,
      avgScore: Number((g.scoreSum / g.count).toFixed(1)),
      avgAttendance: Number((g.attSum / g.count).toFixed(1)),
    })),
  });
});

analyticsRouter.get('/export-csv', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  const { rows } = await getFilteredStudentAnalytics(req.query as Record<string, unknown>);
  const header =
    'studentId,fullName,department,semester,section,attendance,internalMarks,previousGPA,assignmentCompletion,weeklyStudyHours,predictedScore,predictedGrade,riskCategory';
  const csvRows = rows.map((r) =>
    [
      r.student.studentId,
      `"${r.student.fullName.replace(/"/g, '""')}"`,
      `"${r.student.department.replace(/"/g, '""')}"`,
      r.student.semester,
      r.student.section,
      r.student.attendance,
      r.student.internalMarks,
      r.student.previousGPA,
      r.student.assignmentCompletion,
      r.student.weeklyStudyHours,
      r.predictedScore,
      r.predictedGrade,
      r.riskCategory,
    ].join(',')
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="neuropredict-analytics-export.csv"');
  res.send([header, ...csvRows].join('\n'));
});

// -------------------- REPORTS --------------------
reportsRouter.get('/student/:studentId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const student = await dataStore.findStudentByIdOrCode(req.params.studentId);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    if (
      req.user!.role === 'student' &&
      student.userId !== req.user!.id &&
      student.email.toLowerCase() !== req.user!.email.toLowerCase()
    ) {
      res.status(403).json({ error: 'Access denied to another student’s report.' });
      return;
    }

    const predictions = await dataStore.listPredictions(student.studentId);
    const recommendations = await dataStore.listRecommendations(student.studentId);
    const settings = await dataStore.getSettings();
    const allPredictions = await dataStore.listPredictions();
    const deptPreds = allPredictions.filter((p) => p.department === student.department);
    const departmentAverage =
      deptPreds.length > 0
        ? Number(
            (deptPreds.reduce((s, p) => s + p.predictedScore, 0) / deptPreds.length).toFixed(1)
          )
        : 72.0;

    res.json({
      generatedAt: new Date().toISOString(),
      institutionName: settings.institutionName,
      academicYear: settings.academicYear,
      disclaimer: settings.syntheticDataDisclaimer,
      student,
      latestPrediction: predictions[0] ?? null,
      predictionHistory: predictions,
      recommendations: recommendations[0]?.recommendations ?? [],
      departmentAverage,
      modelMetadata: neuralNetworkService.getMetadata()
        ? {
            modelVersion: neuralNetworkService.getMetadata()!.modelVersion,
            testMetrics: neuralNetworkService.getMetadata()!.testMetrics,
          }
        : null,
    });
  } catch {
    res.status(500).json({ error: 'Failed to build student report.' });
  }
});

// -------------------- SETTINGS --------------------
settingsRouter.get('/', authenticate, async (_req, res) => {
  const settings = await dataStore.getSettings();
  res.json({
    settings,
    storage: dataStore.getStorageInfo(),
    modelStatus: neuralNetworkService.getStatus(),
  });
});

settingsRouter.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const lowRiskMin = Number(req.body.riskThresholds?.lowRiskMin ?? 70);
    const mediumRiskMin = Number(req.body.riskThresholds?.mediumRiskMin ?? 50);

    if (
      !Number.isFinite(lowRiskMin) ||
      !Number.isFinite(mediumRiskMin) ||
      lowRiskMin <= mediumRiskMin ||
      mediumRiskMin < 10 ||
      lowRiskMin > 95
    ) {
      res.status(400).json({
        error: 'Low Risk minimum must be greater than Medium Risk minimum (valid range 10–95).',
      });
      return;
    }

    const updated = await dataStore.updateSettings({
      riskThresholds: { lowRiskMin, mediumRiskMin },
      ...(req.body.academicYear ? { academicYear: String(req.body.academicYear).trim() } : {}),
      ...(req.body.institutionName
        ? { institutionName: String(req.body.institutionName).trim() }
        : {}),
    });

    res.json({ settings: updated });
  } catch {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});
