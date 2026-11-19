import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  classifyGrade,
  classifyRisk,
  FEATURE_METADATA,
  generateRuleBasedRecommendations,
  validateAcademicFeatures,
} from '../../shared/academicRules.ts';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.ts';
import { dataStore } from '../services/dataStore.ts';
import { neuralNetworkService } from '../services/neuralNetwork.ts';

export const predictionRouter = Router();
export const modelRouter = Router();
export const recommendationRouter = Router();

const predictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many prediction requests. Please wait a moment.' },
});

// -------------------- PREDICTIONS --------------------
predictionRouter.post('/predict', authenticate, predictLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const body = req.body;

    // Validate the 9 neural network inputs
    const check = validateAcademicFeatures({
      attendance: body.attendance,
      internalMarks: body.internalMarks,
      previousGPA: body.previousGPA,
      assignmentCompletion: body.assignmentCompletion,
      weeklyStudyHours: body.weeklyStudyHours,
      previousPerformance: body.previousPerformance,
      subjectsNeedingImprovement: body.subjectsNeedingImprovement,
      participationScore: body.participationScore,
      semester: body.semester ?? 6,
    });

    if (!check.valid || !check.sanitized) {
      res.status(400).json({ error: Object.values(check.errors)[0], details: check.errors });
      return;
    }

    const features = check.sanitized;
    let studentId = String(body.studentId || 'AD-HOC').toUpperCase().trim();
    let studentName = String(body.studentName || user.name).trim();
    let department = String(body.department || user.department || 'Computer Science & Engineering').trim();

    if (studentId !== 'AD-HOC') {
      const student = await dataStore.findStudentByIdOrCode(studentId);
      if (student) {
        if (
          user.role === 'student' &&
          student.userId !== user.id &&
          student.email.toLowerCase() !== user.email.toLowerCase()
        ) {
          res.status(403).json({ error: 'Students may only generate predictions for their own profile.' });
          return;
        }
        studentId = student.studentId;
        studentName = student.fullName;
        department = student.department;
      }
    } else if (user.role === 'student') {
      const own = await dataStore.findStudentByUserOrEmail(user.id, user.email);
      if (own) {
        studentId = own.studentId;
        studentName = own.fullName;
        department = own.department;
      }
    }

    const settings = await dataStore.getSettings();
    const nnResult = await neuralNetworkService.predict(features);
    const predictedGrade = classifyGrade(nnResult.predictedScore);
    const riskCategory = classifyRisk(nnResult.predictedScore, settings.riskThresholds);

    const savedPrediction = await dataStore.createPrediction({
      studentId,
      studentName,
      department,
      semester: features.semester,
      inputFeatures: features,
      predictedScore: nnResult.predictedScore,
      predictedGrade,
      riskCategory,
      uncertaintyBand: nnResult.uncertaintyBand,
      featureContributions: nnResult.featureContributions,
      modelVersion: nnResult.modelVersion,
      createdBy: user.email,
    });

    const recommendations = generateRuleBasedRecommendations(
      features,
      nnResult.predictedScore,
      settings.riskThresholds
    );

    const savedRec = await dataStore.saveRecommendation({
      studentId,
      predictionId: savedPrediction.id,
      engineType: 'rule-based',
      recommendations,
    });

    // Compute real department average from saved predictions
    const allPredictions = await dataStore.listPredictions();
    const deptPreds = allPredictions.filter((p) => p.department === department);
    const departmentAverage =
      deptPreds.length > 0
        ? Number(
            (deptPreds.reduce((s, p) => s + p.predictedScore, 0) / deptPreds.length).toFixed(1)
          )
        : 72.5;

    const overallAverage =
      allPredictions.length > 0
        ? Number(
            (
              allPredictions.reduce((s, p) => s + p.predictedScore, 0) / allPredictions.length
            ).toFixed(1)
          )
        : 72.5;

    res.status(201).json({
      prediction: savedPrediction,
      recommendations: savedRec,
      benchmarks: {
        departmentAverage,
        overallAverage,
        deltaFromDepartment: Number((savedPrediction.predictedScore - departmentAverage).toFixed(1)),
      },
      thresholds: settings.riskThresholds,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Prediction execution failed.',
    });
  }
});

predictionRouter.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    let list = await dataStore.listPredictions();

    if (user.role === 'student') {
      const own = await dataStore.findStudentByUserOrEmail(user.id, user.email);
      const ownId = own?.studentId.toUpperCase();
      list = list.filter(
        (p) => (ownId && p.studentId.toUpperCase() === ownId) || p.createdBy === user.email
      );
    }

    const search = String(req.query.search || '').trim().toLowerCase();
    const risk = String(req.query.risk || '').trim();
    const department = String(req.query.department || '').trim();

    if (search) {
      list = list.filter(
        (p) =>
          p.studentName.toLowerCase().includes(search) ||
          p.studentId.toLowerCase().includes(search) ||
          p.department.toLowerCase().includes(search)
      );
    }
    if (risk && risk !== 'all') {
      list = list.filter((p) => p.riskCategory === risk);
    }
    if (department && department !== 'all') {
      list = list.filter((p) => p.department === department);
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 15)));
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const predictions = list.slice((page - 1) * limit, page * limit);

    res.json({
      predictions,
      pagination: { page, limit, total, totalPages },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load prediction history.' });
  }
});

predictionRouter.get('/student/:studentId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const targetId = req.params.studentId.toUpperCase();
    if (user.role === 'student') {
      const own = await dataStore.findStudentByUserOrEmail(user.id, user.email);
      if (!own || own.studentId.toUpperCase() !== targetId) {
        res.status(403).json({ error: 'Access denied to another student’s predictions.' });
        return;
      }
    }
    const predictions = await dataStore.listPredictions(targetId);
    res.json({ predictions });
  } catch {
    res.status(500).json({ error: 'Failed to load student predictions.' });
  }
});

predictionRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const prediction = await dataStore.findPredictionById(req.params.id);
    if (!prediction) {
      res.status(404).json({ error: 'Prediction record not found.' });
      return;
    }
    if (req.user!.role === 'student') {
      const own = await dataStore.findStudentByUserOrEmail(req.user!.id, req.user!.email);
      if (
        (!own || own.studentId.toUpperCase() !== prediction.studentId.toUpperCase()) &&
        prediction.createdBy !== req.user!.email
      ) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    }
    res.json({ prediction });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve prediction.' });
  }
});

// -------------------- AI MODEL ENDPOINTS --------------------
modelRouter.get('/status', authenticate, (_req, res) => {
  res.json({
    ...neuralNetworkService.getStatus(),
    storage: dataStore.getStorageInfo(),
  });
});

modelRouter.get('/metrics', authenticate, async (_req, res) => {
  const latest = neuralNetworkService.getMetadata();
  const history = await dataStore.listModelTrainings();
  res.json({ latest, history });
});

modelRouter.get('/architecture', authenticate, (_req, res) => {
  const meta = neuralNetworkService.getMetadata();
  res.json({
    modelVersion: meta?.modelVersion ?? 'v1.0',
    architecture: meta?.architecture ?? {
      inputUnits: 9,
      hiddenLayers: [
        { units: 16, activation: 'relu' },
        { units: 8, activation: 'relu' },
      ],
      outputUnits: 1,
      outputActivation: 'sigmoid',
      totalParameters: 305,
    },
    features: FEATURE_METADATA,
    optimizer: {
      name: 'Adam',
      learningRate: meta?.learningRate ?? 0.001,
    },
    lossFunction: 'Mean Squared Error (MSE)',
    metrics: ['Mean Absolute Error (MAE)', 'RMSE', 'R²', 'Split-Conformal 90% Interval'],
    normalizationStats: meta?.normalizationStats ?? null,
    featureImportance: meta?.featureImportance ?? [],
  });
});

modelRouter.post('/train', authenticate, authorize('admin'), async (req, res) => {
  try {
    const epochs = Number(req.body.epochs ?? 35);
    const batchSize = Number(req.body.batchSize ?? 32);
    const learningRate = Number(req.body.learningRate ?? 0.001);
    const datasetSize = Number(req.body.datasetSize ?? 1200);
    const seed = Number(req.body.seed ?? 20260417);

    const record = await neuralNetworkService.trainModel({
      epochs,
      batchSize,
      learningRate,
      datasetSize,
      seed,
    });

    await dataStore.saveModelTraining(record);
    res.status(201).json({ training: record });
  } catch (err) {
    res.status(409).json({
      error: err instanceof Error ? err.message : 'Model training failed.',
    });
  }
});

modelRouter.post('/inspect', authenticate, async (req, res) => {
  try {
    const check = validateAcademicFeatures({
      attendance: req.body.attendance ?? 82,
      internalMarks: req.body.internalMarks ?? 76,
      previousGPA: req.body.previousGPA ?? 7.8,
      assignmentCompletion: req.body.assignmentCompletion ?? 84,
      weeklyStudyHours: req.body.weeklyStudyHours ?? 18,
      previousPerformance: req.body.previousPerformance ?? 77,
      subjectsNeedingImprovement: req.body.subjectsNeedingImprovement ?? 1,
      participationScore: req.body.participationScore ?? 75,
      semester: req.body.semester ?? 6,
    });
    if (!check.valid || !check.sanitized) {
      res.status(400).json({ error: Object.values(check.errors)[0] });
      return;
    }

    const inspection = await neuralNetworkService.inspectForwardPass(check.sanitized);
    res.json({ inspection });
  } catch {
    res.status(500).json({ error: 'Failed to inspect neural network forward pass.' });
  }
});

// -------------------- RECOMMENDATIONS --------------------
recommendationRouter.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const students = await dataStore.listStudents();
  const predictions = await dataStore.listPredictions();
  const allRecs = await dataStore.listRecommendations();

  let scopedStudents = students;
  if (user.role === 'student') {
    scopedStudents = students.filter(
      (s) => s.userId === user.id || s.email.toLowerCase() === user.email.toLowerCase()
    );
  }

  const latestPredByStudent = new Map<string, (typeof predictions)[number]>();
  for (const p of predictions) {
    if (!latestPredByStudent.has(p.studentId.toUpperCase())) {
      latestPredByStudent.set(p.studentId.toUpperCase(), p);
    }
  }

  const latestRecByStudent = new Map<string, (typeof allRecs)[number]>();
  for (const r of allRecs) {
    if (!latestRecByStudent.has(r.studentId.toUpperCase())) {
      latestRecByStudent.set(r.studentId.toUpperCase(), r);
    }
  }

  const items = scopedStudents.map((s) => {
    const pred = latestPredByStudent.get(s.studentId.toUpperCase()) ?? null;
    const rec = latestRecByStudent.get(s.studentId.toUpperCase()) ?? null;
    return {
      studentId: s.studentId,
      studentName: s.fullName,
      department: s.department,
      semester: s.semester,
      attendance: s.attendance,
      internalMarks: s.internalMarks,
      predictedScore: pred?.predictedScore ?? null,
      riskCategory: pred?.riskCategory ?? 'Medium Risk',
      engineType: 'rule-based' as const,
      recommendations: rec?.recommendations ?? [],
      updatedAt: rec?.createdAt ?? s.updatedAt,
    };
  });

  res.json({
    engineDisclosure:
      'Recommendations are generated by a transparent deterministic rule-based academic advisor engine triggered by each student’s actual inputs and neural network score.',
    items,
  });
});

recommendationRouter.get('/:studentId', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const targetId = req.params.studentId.toUpperCase();
  if (user.role === 'student') {
    const own = await dataStore.findStudentByUserOrEmail(user.id, user.email);
    if (!own || own.studentId.toUpperCase() !== targetId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
  }
  const records = await dataStore.listRecommendations(targetId);
  res.json({
    engineType: 'rule-based',
    latest: records[0] ?? null,
    history: records,
  });
});
