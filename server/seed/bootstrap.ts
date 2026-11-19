import {
  classifyGrade,
  classifyRisk,
  generateRuleBasedRecommendations,
} from '../../shared/academicRules';
import { hashPassword } from '../middleware/auth';
import { dataStore } from '../services/dataStore';
import { neuralNetworkService } from '../services/neuralNetwork';
import { buildDemoStudents } from '../services/syntheticData';

export async function bootstrapApplication(): Promise<void> {
  await dataStore.connect();

  // 1. Seed demo user accounts if database is empty
  const existingUsers = await dataStore.listUsers();
  let studentUserId: string | undefined;

  if (existingUsers.length === 0) {
    const adminHash = await hashPassword('Admin@123');
    const facultyHash = await hashPassword('Faculty@123');
    const studentHash = await hashPassword('Student@123');

    await dataStore.createUser({
      name: 'Dr. Kavita Rao',
      email: 'admin@neuropredict.edu',
      passwordHash: adminHash,
      role: 'admin',
      department: 'Academic Administration',
    });

    await dataStore.createUser({
      name: 'Prof. Rajesh Subramanian',
      email: 'faculty@neuropredict.edu',
      passwordHash: facultyHash,
      role: 'faculty',
      department: 'Computer Science & Engineering',
    });

    await dataStore.createUser({
      name: 'Prof. Sunita Deshpande',
      email: 'aids.faculty@neuropredict.edu',
      passwordHash: facultyHash,
      role: 'faculty',
      department: 'Artificial Intelligence & Data Science',
    });

    const studentUser = await dataStore.createUser({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@neuropredict.edu',
      passwordHash: studentHash,
      role: 'student',
      department: 'Computer Science & Engineering',
    });
    studentUserId = studentUser.id;
  } else {
    const aarav = await dataStore.findUserByEmail('aarav.sharma@neuropredict.edu');
    studentUserId = aarav?.id;
  }

  // 2. Seed 24 named demo students if collection is empty
  const existingStudents = await dataStore.listStudents();
  if (existingStudents.length === 0) {
    const demoStudents = buildDemoStudents();
    for (const s of demoStudents) {
      await dataStore.createStudent({
        ...s,
        userId: s.studentId === 'NP2023001' ? studentUserId : undefined,
      });
    }
  }

  // 3. Initialize or train the real TensorFlow.js Artificial Neural Network
  const trainingMeta = await neuralNetworkService.initialize();
  const trainings = await dataStore.listModelTrainings();
  if (trainings.length === 0) {
    await dataStore.saveModelTraining(trainingMeta);
  }

  // 4. Generate initial TensorFlow.js predictions & rule-based recommendations for seeded students
  const existingPredictions = await dataStore.listPredictions();
  if (existingPredictions.length === 0) {
    const students = await dataStore.listStudents();
    const settings = await dataStore.getSettings();

    for (const student of students) {
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

      const result = await neuralNetworkService.predict(features);
      const predictedGrade = classifyGrade(result.predictedScore);
      const riskCategory = classifyRisk(result.predictedScore, settings.riskThresholds);

      const savedPred = await dataStore.createPrediction({
        studentId: student.studentId,
        studentName: student.fullName,
        department: student.department,
        semester: student.semester,
        inputFeatures: features,
        predictedScore: result.predictedScore,
        predictedGrade,
        riskCategory,
        uncertaintyBand: result.uncertaintyBand,
        featureContributions: result.featureContributions,
        modelVersion: result.modelVersion,
        createdBy: 'system-seed',
      });

      const recs = generateRuleBasedRecommendations(
        features,
        result.predictedScore,
        settings.riskThresholds
      );
      await dataStore.saveRecommendation({
        studentId: student.studentId,
        predictionId: savedPred.id,
        engineType: 'rule-based',
        recommendations: recs,
      });
    }
  }
}
