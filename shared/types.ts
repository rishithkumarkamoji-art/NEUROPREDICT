export type UserRole = 'admin' | 'faculty' | 'student';

export type RiskCategory = 'Low Risk' | 'Medium Risk' | 'High Risk';

export type GradeCategory =
  | 'Excellent'
  | 'Very Good'
  | 'Good'
  | 'Average'
  | 'Needs Improvement'
  | 'Critical';

export interface AcademicFeatures {
  attendance: number; // 0-100 (%)
  internalMarks: number; // 0-100
  previousGPA: number; // 0-10
  assignmentCompletion: number; // 0-100 (%)
  weeklyStudyHours: number; // 0-45 (hrs/week)
  previousPerformance: number; // 0-100 (%)
  subjectsNeedingImprovement: number; // 0-8 count
  participationScore: number; // 0-100
  semester: number; // 1-8
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt: string;
}

export interface AcademicHistoryPoint {
  month: string;
  gpa: number;
  attendance: number;
  score: number;
}

export interface StudentRecord {
  id: string;
  studentId: string;
  userId?: string;
  fullName: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  enrollmentYear: number;
  attendance: number;
  internalMarks: number;
  previousGPA: number;
  assignmentCompletion: number;
  weeklyStudyHours: number;
  previousPerformance: number;
  subjectsNeedingImprovement: number;
  participationScore: number;
  history: AcademicHistoryPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationItem {
  id: string;
  category:
    | 'Attendance'
    | 'Internal Marks'
    | 'Assignments'
    | 'Study Routine'
    | 'GPA Recovery'
    | 'Backlog Clearance'
    | 'Participation'
    | 'Enrichment';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  actionPlan: string;
  triggerReason: string;
}

export interface FeatureContribution {
  feature: keyof AcademicFeatures;
  label: string;
  value: number;
  normalizedValue: number;
  importancePct: number;
  impactDirection: 'positive' | 'negative' | 'neutral';
}

export interface PredictionRecord {
  id: string;
  studentId: string; // references StudentRecord.studentId or 'AD-HOC'
  studentName: string;
  department: string;
  semester: number;
  inputFeatures: AcademicFeatures;
  predictedScore: number; // 0-100
  predictedGrade: GradeCategory;
  riskCategory: RiskCategory;
  uncertaintyBand: {
    lowerBound: number;
    upperBound: number;
    halfWidth: number;
    method: string;
    calibrationCoveragePct: number;
  };
  featureContributions: FeatureContribution[];
  modelVersion: string;
  createdBy: string;
  createdAt: string;
}

export interface RecommendationRecord {
  id: string;
  studentId: string;
  predictionId: string;
  engineType: 'rule-based';
  recommendations: RecommendationItem[];
  createdAt: string;
}

export interface EpochMetric {
  epoch: number;
  loss: number;
  valLoss: number;
  mae: number;
  valMae: number;
}

export interface FeatureImportanceItem {
  feature: keyof AcademicFeatures;
  label: string;
  importance: number; // 0-100 normalized percentage
  maeDelta: number; // MAE increase when feature is permuted
}

export interface ActualVsPredictedPoint {
  index: number;
  actual: number;
  predicted: number;
  error: number;
}

export interface NormalizationStats {
  featureOrder: (keyof AcademicFeatures)[];
  means: number[];
  stds: number[];
  mins: number[];
  maxs: number[];
}

export interface ModelTrainingRecord {
  id: string;
  modelVersion: string;
  architecture: {
    inputUnits: number;
    hiddenLayers: { units: number; activation: string }[];
    outputUnits: number;
    outputActivation: string;
    totalParameters: number;
  };
  optimizer: string;
  learningRate: number;
  lossFunction: string;
  epochs: number;
  batchSize: number;
  datasetSize: number;
  trainSplitSize: number;
  valSplitSize: number;
  testSplitSize: number;
  trainingLoss: number;
  validationLoss: number;
  trainingMae: number;
  validationMae: number;
  testMetrics: {
    mse: number;
    mae: number;
    rmse: number;
    r2: number;
    conformalHalfWidth: number;
    empiricalCoveragePct: number;
  };
  epochHistory: EpochMetric[];
  featureImportance: FeatureImportanceItem[];
  actualVsPredicted: ActualVsPredictedPoint[];
  normalizationStats: NormalizationStats;
  trainingDate: string;
  durationMs: number;
}

export interface SystemSettings {
  riskThresholds: {
    lowRiskMin: number; // default 70
    mediumRiskMin: number; // default 50
  };
  academicYear: string;
  institutionName: string;
  syntheticDataDisclaimer: string;
}

export interface ForwardPassInspection {
  modelVersion: string;
  inputs: { feature: keyof AcademicFeatures; label: string; raw: number; normalized: number }[];
  hidden1: { index: number; preActivation: number; activation: number; bias: number }[];
  hidden2: { index: number; preActivation: number; activation: number; bias: number }[];
  output: { preActivation: number; sigmoid: number; predictedScore: number; bias: number };
  weights: {
    inputToHidden1: number[][]; // 9 x 16
    hidden1ToHidden2: number[][]; // 16 x 8
    hidden2ToOutput: number[][]; // 8 x 1
  };
}
