import { Router, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import {
  classifyGrade,
  classifyRisk,
  generateRuleBasedRecommendations,
  parseAndValidateStudentCsv,
  REQUIRED_CSV_COLUMNS,
  validateAcademicFeatures,
} from '../../shared/academicRules.ts';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.ts';
import { dataStore } from '../services/dataStore.ts';
import { neuralNetworkService } from '../services/neuralNetwork.ts';

export const studentRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB CSV limit
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed.'));
    }
  },
});

const studentValidators = [
  body('studentId').trim().notEmpty().withMessage('Student ID is required.'),
  body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Valid student email is required.'),
  body('department').trim().notEmpty().withMessage('Department is required.'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8.'),
  body('section').trim().notEmpty().withMessage('Section is required.'),
  body('enrollmentYear')
    .isInt({ min: 2018, max: 2030 })
    .withMessage('Enrollment year must be between 2018 and 2030.'),
  body('attendance').isFloat({ min: 0, max: 100 }).withMessage('Attendance must be 0–100%.'),
  body('internalMarks').isFloat({ min: 0, max: 100 }).withMessage('Internal marks must be 0–100.'),
  body('previousGPA').isFloat({ min: 0, max: 10 }).withMessage('Previous GPA must be 0–10.'),
  body('assignmentCompletion')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Assignment completion must be 0–100%.'),
  body('weeklyStudyHours')
    .isFloat({ min: 0, max: 45 })
    .withMessage('Weekly study hours must be 0–45.'),
  body('previousPerformance')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Previous performance must be 0–100%.'),
  body('subjectsNeedingImprovement')
    .isInt({ min: 0, max: 8 })
    .withMessage('Subjects needing improvement must be 0–8.'),
  body('participationScore')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Participation score must be 0–100.'),
];

studentRouter.get('/sample-csv', authenticate, (_req, res) => {
  const header = REQUIRED_CSV_COLUMNS.join(',');
  const rows = [
    'NP2026101,Riya Deshpande,riya.deshpande@neuropredict.edu,Computer Science & Engineering,6,A,2023,89,84,8.7,91,21,85,0,88',
    'NP2026102,Karanbir Singh,karanbir.singh@neuropredict.edu,Electronics & Communication,5,B,2024,62,55,6.0,64,10,58,2,54',
    'NP2026103,Zoya Siddiqui,zoya.siddiqui@neuropredict.edu,Artificial Intelligence & Data Science,4,A,2024,94,91,9.3,96,26,92,0,91',
    'NP2026104,Omkar Kulkarni,omkar.kulkarni@neuropredict.edu,Mechanical Engineering,6,C,2023,49,41,4.8,45,6,46,4,39',
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="neuropredict-sample-students.csv"');
  res.send([header, ...rows].join('\n'));
});

studentRouter.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const allStudents = await dataStore.listStudents();
    const predictions = await dataStore.listPredictions();
    const settings = await dataStore.getSettings();

    const latestPredByStudent = new Map<string, (typeof predictions)[number]>();
    for (const p of predictions) {
      const code = p.studentId.toUpperCase();
      if (!latestPredByStudent.has(code)) {
        latestPredByStudent.set(code, p);
      }
    }

    let scoped = allStudents;
    if (user.role === 'student') {
      scoped = allStudents.filter(
        (s) => s.userId === user.id || s.email.toLowerCase() === user.email.toLowerCase()
      );
    } else if (user.role === 'faculty' && req.query.assignedOnly === 'true' && user.department) {
      scoped = allStudents.filter((s) => s.department === user.department);
    }

    // Attach latest prediction summary to each student
    let enriched = scoped.map((s) => {
      const pred = latestPredByStudent.get(s.studentId.toUpperCase());
      const score = pred?.predictedScore ?? null;
      const riskCategory =
        score !== null ? classifyRisk(score, settings.riskThresholds) : 'Medium Risk';
      return {
        ...s,
        latestPrediction: pred
          ? {
              id: pred.id,
              predictedScore: pred.predictedScore,
              predictedGrade: pred.predictedGrade,
              riskCategory,
              modelVersion: pred.modelVersion,
              createdAt: pred.createdAt,
            }
          : null,
      };
    });

    // Apply filters
    const search = String(req.query.search || '').trim().toLowerCase();
    const department = String(req.query.department || '').trim();
    const semester = req.query.semester ? Number(req.query.semester) : null;
    const section = String(req.query.section || '').trim();
    const risk = String(req.query.risk || '').trim();
    const year = req.query.year ? Number(req.query.year) : null;

    if (search) {
      enriched = enriched.filter(
        (s) =>
          s.fullName.toLowerCase().includes(search) ||
          s.studentId.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.department.toLowerCase().includes(search)
      );
    }
    if (department && department !== 'all') {
      enriched = enriched.filter((s) => s.department === department);
    }
    if (semester && Number.isFinite(semester)) {
      enriched = enriched.filter((s) => s.semester === semester);
    }
    if (section && section !== 'all') {
      enriched = enriched.filter((s) => s.section === section);
    }
    if (risk && risk !== 'all') {
      enriched = enriched.filter((s) => s.latestPrediction?.riskCategory === risk);
    }
    if (year && Number.isFinite(year)) {
      enriched = enriched.filter((s) => s.enrollmentYear === year);
    }

    // Sorting
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortOrder = String(req.query.sortOrder || 'desc') === 'asc' ? 1 : -1;
    enriched.sort((a, b) => {
      let va: number | string = a.createdAt;
      let vb: number | string = b.createdAt;
      if (sortBy === 'fullName') {
        va = a.fullName.toLowerCase();
        vb = b.fullName.toLowerCase();
      } else if (sortBy === 'studentId') {
        va = a.studentId;
        vb = b.studentId;
      } else if (sortBy === 'attendance') {
        va = a.attendance;
        vb = b.attendance;
      } else if (sortBy === 'previousGPA') {
        va = a.previousGPA;
        vb = b.previousGPA;
      } else if (sortBy === 'predictedScore') {
        va = a.latestPrediction?.predictedScore ?? -1;
        vb = b.latestPrediction?.predictedScore ?? -1;
      }
      if (va < vb) return -1 * sortOrder;
      if (va > vb) return 1 * sortOrder;
      return 0;
    });

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 12)));
    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    res.json({
      students: paginated,
      pagination: { page, limit, total, totalPages },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load students.' });
  }
});

studentRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const student = await dataStore.findStudentByIdOrCode(req.params.id);
    if (!student) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    // Strict ownership enforcement for Student role
    if (
      req.user!.role === 'student' &&
      student.userId !== req.user!.id &&
      student.email.toLowerCase() !== req.user!.email.toLowerCase()
    ) {
      res.status(403).json({ error: 'Access denied. You may only view your own academic record.' });
      return;
    }

    const predictions = await dataStore.listPredictions(student.studentId);
    const recommendations = await dataStore.listRecommendations(student.studentId);

    res.json({
      student,
      predictions,
      latestRecommendations: recommendations[0] ?? null,
    });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve student details.' });
  }
});

studentRouter.post(
  '/',
  authenticate,
  authorize('admin', 'faculty'),
  studentValidators,
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
      return;
    }

    try {
      const b = req.body;
      const features = {
        attendance: Number(b.attendance),
        internalMarks: Number(b.internalMarks),
        previousGPA: Number(b.previousGPA),
        assignmentCompletion: Number(b.assignmentCompletion),
        weeklyStudyHours: Number(b.weeklyStudyHours),
        previousPerformance: Number(b.previousPerformance),
        subjectsNeedingImprovement: Number(b.subjectsNeedingImprovement),
        participationScore: Number(b.participationScore),
        semester: Number(b.semester),
      };

      const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      const history = months.map((month, idx) => ({
        month,
        gpa: Number(Math.min(10, Math.max(0, features.previousGPA + (idx - 5) * 0.08)).toFixed(2)),
        attendance: Number(Math.min(100, Math.max(0, features.attendance + (idx - 5) * 0.6)).toFixed(1)),
        score: Number(Math.min(100, Math.max(0, features.previousPerformance + (idx - 5) * 0.9)).toFixed(1)),
      }));

      const student = await dataStore.createStudent({
        studentId: String(b.studentId).toUpperCase().trim(),
        fullName: String(b.fullName).trim(),
        email: String(b.email).toLowerCase().trim(),
        department: String(b.department).trim(),
        semester: features.semester,
        section: String(b.section).trim(),
        enrollmentYear: Number(b.enrollmentYear),
        attendance: features.attendance,
        internalMarks: features.internalMarks,
        previousGPA: features.previousGPA,
        assignmentCompletion: features.assignmentCompletion,
        weeklyStudyHours: features.weeklyStudyHours,
        previousPerformance: features.previousPerformance,
        subjectsNeedingImprovement: features.subjectsNeedingImprovement,
        participationScore: features.participationScore,
        history,
      });

      // Automatically run TensorFlow.js baseline prediction for the new student
      const settings = await dataStore.getSettings();
      const predResult = await neuralNetworkService.predict(features);
      const predictedGrade = classifyGrade(predResult.predictedScore);
      const riskCategory = classifyRisk(predResult.predictedScore, settings.riskThresholds);

      const savedPred = await dataStore.createPrediction({
        studentId: student.studentId,
        studentName: student.fullName,
        department: student.department,
        semester: student.semester,
        inputFeatures: features,
        predictedScore: predResult.predictedScore,
        predictedGrade,
        riskCategory,
        uncertaintyBand: predResult.uncertaintyBand,
        featureContributions: predResult.featureContributions,
        modelVersion: predResult.modelVersion,
        createdBy: req.user!.email,
      });

      const recs = generateRuleBasedRecommendations(
        features,
        predResult.predictedScore,
        settings.riskThresholds
      );
      await dataStore.saveRecommendation({
        studentId: student.studentId,
        predictionId: savedPred.id,
        engineType: 'rule-based',
        recommendations: recs,
      });

      res.status(201).json({ student, initialPrediction: savedPred });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to register student.',
      });
    }
  }
);

studentRouter.put(
  '/:id',
  authenticate,
  authorize('admin', 'faculty'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const existing = await dataStore.findStudentByIdOrCode(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }

      const b = req.body;
      const mergedFeatures = {
        attendance: b.attendance !== undefined ? Number(b.attendance) : existing.attendance,
        internalMarks: b.internalMarks !== undefined ? Number(b.internalMarks) : existing.internalMarks,
        previousGPA: b.previousGPA !== undefined ? Number(b.previousGPA) : existing.previousGPA,
        assignmentCompletion:
          b.assignmentCompletion !== undefined
            ? Number(b.assignmentCompletion)
            : existing.assignmentCompletion,
        weeklyStudyHours:
          b.weeklyStudyHours !== undefined ? Number(b.weeklyStudyHours) : existing.weeklyStudyHours,
        previousPerformance:
          b.previousPerformance !== undefined
            ? Number(b.previousPerformance)
            : existing.previousPerformance,
        subjectsNeedingImprovement:
          b.subjectsNeedingImprovement !== undefined
            ? Number(b.subjectsNeedingImprovement)
            : existing.subjectsNeedingImprovement,
        participationScore:
          b.participationScore !== undefined
            ? Number(b.participationScore)
            : existing.participationScore,
        semester: b.semester !== undefined ? Number(b.semester) : existing.semester,
      };

      const check = validateAcademicFeatures(mergedFeatures);
      if (!check.valid) {
        res.status(400).json({ error: Object.values(check.errors)[0], details: check.errors });
        return;
      }

      const updated = await dataStore.updateStudent(existing.id, {
        ...(b.fullName ? { fullName: String(b.fullName).trim() } : {}),
        ...(b.email ? { email: String(b.email).toLowerCase().trim() } : {}),
        ...(b.department ? { department: String(b.department).trim() } : {}),
        ...(b.section ? { section: String(b.section).trim() } : {}),
        ...(b.enrollmentYear ? { enrollmentYear: Number(b.enrollmentYear) } : {}),
        ...mergedFeatures,
      });

      if (!updated) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }

      // Refresh neural network prediction on academic update
      const settings = await dataStore.getSettings();
      const predResult = await neuralNetworkService.predict(mergedFeatures);
      const savedPred = await dataStore.createPrediction({
        studentId: updated.studentId,
        studentName: updated.fullName,
        department: updated.department,
        semester: updated.semester,
        inputFeatures: mergedFeatures,
        predictedScore: predResult.predictedScore,
        predictedGrade: classifyGrade(predResult.predictedScore),
        riskCategory: classifyRisk(predResult.predictedScore, settings.riskThresholds),
        uncertaintyBand: predResult.uncertaintyBand,
        featureContributions: predResult.featureContributions,
        modelVersion: predResult.modelVersion,
        createdBy: req.user!.email,
      });

      const recs = generateRuleBasedRecommendations(
        mergedFeatures,
        predResult.predictedScore,
        settings.riskThresholds
      );
      await dataStore.saveRecommendation({
        studentId: updated.studentId,
        predictionId: savedPred.id,
        engineType: 'rule-based',
        recommendations: recs,
      });

      res.json({ student: updated, latestPrediction: savedPred });
    } catch {
      res.status(500).json({ error: 'Failed to update student record.' });
    }
  }
);

studentRouter.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const deleted = await dataStore.deleteStudent(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  res.json({ deleted: true });
});

studentRouter.post(
  '/import',
  authenticate,
  authorize('admin', 'faculty'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const csvText = req.file
        ? req.file.buffer.toString('utf-8')
        : typeof req.body.csvText === 'string'
        ? req.body.csvText
        : '';

      if (!csvText.trim()) {
        res.status(400).json({ error: 'Please upload a valid CSV file.' });
        return;
      }

      const existingStudents = await dataStore.listStudents();
      const existingIds = new Set(existingStudents.map((s) => s.studentId.toUpperCase()));
      const parsed = parseAndValidateStudentCsv(csvText, existingIds);

      if (parsed.missingColumns.length > 0) {
        res.status(400).json({
          error: `Missing required CSV columns: ${parsed.missingColumns.join(', ')}`,
          missingColumns: parsed.missingColumns,
        });
        return;
      }

      const isPreview = req.query.preview === 'true' || req.body.preview === 'true';
      if (isPreview) {
        res.json({
          preview: true,
          totalRows: parsed.rows.length,
          validCount: parsed.rows.filter((r) => r.valid).length,
          duplicateCount: parsed.rows.filter((r) => r.isDuplicate).length,
          invalidCount: parsed.rows.filter((r) => !r.valid && !r.isDuplicate).length,
          rows: parsed.rows,
        });
        return;
      }

      const settings = await dataStore.getSettings();
      const imported: string[] = [];
      const failed: { rowNumber: number; studentId: string; reason: string }[] = [];

      for (const row of parsed.rows) {
        if (!row.valid) {
          failed.push({
            rowNumber: row.rowNumber,
            studentId: row.data.studentId || '(empty)',
            reason: row.isDuplicate ? 'Duplicate studentId' : row.errors.join('; '),
          });
          continue;
        }
        try {
          const d = row.data;
          const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
          const history = months.map((month, idx) => ({
            month,
            gpa: Number(Math.min(10, Math.max(0, d.previousGPA + (idx - 5) * 0.06)).toFixed(2)),
            attendance: Number(Math.min(100, Math.max(0, d.attendance + (idx - 5) * 0.5)).toFixed(1)),
            score: Number(Math.min(100, Math.max(0, d.previousPerformance + (idx - 5) * 0.7)).toFixed(1)),
          }));

          const student = await dataStore.createStudent({
            ...d,
            history,
          });

          const features = {
            attendance: student.attendance,
            internalMarks: student.internalMarks,
            previousGPA: student.previousGPA,
            assignmentCompletion: student.assignmentCompletion,
            weeklyStudyHours: student.weeklyStudyHours,
            previousPerformance: student.previousPerformance,
            subjectsNeedingImprovement: student.subjectsNeedingImprovement,
            participationScore: student.participationScore,
            semester: student.semester,
          };

          const predResult = await neuralNetworkService.predict(features);
          const savedPred = await dataStore.createPrediction({
            studentId: student.studentId,
            studentName: student.fullName,
            department: student.department,
            semester: student.semester,
            inputFeatures: features,
            predictedScore: predResult.predictedScore,
            predictedGrade: classifyGrade(predResult.predictedScore),
            riskCategory: classifyRisk(predResult.predictedScore, settings.riskThresholds),
            uncertaintyBand: predResult.uncertaintyBand,
            featureContributions: predResult.featureContributions,
            modelVersion: predResult.modelVersion,
            createdBy: req.user!.email,
          });

          await dataStore.saveRecommendation({
            studentId: student.studentId,
            predictionId: savedPred.id,
            engineType: 'rule-based',
            recommendations: generateRuleBasedRecommendations(
              features,
              predResult.predictedScore,
              settings.riskThresholds
            ),
          });

          imported.push(student.studentId);
        } catch (err) {
          failed.push({
            rowNumber: row.rowNumber,
            studentId: row.data.studentId,
            reason: err instanceof Error ? err.message : 'Insert error',
          });
        }
      }

      res.status(201).json({
        preview: false,
        importedCount: imported.length,
        failedCount: failed.length,
        importedIds: imported,
        failures: failed,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'CSV import failed.',
      });
    }
  }
);
