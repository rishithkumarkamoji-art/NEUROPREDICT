import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'faculty', 'student'], required: true, index: true },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

const AcademicHistorySchema = new Schema(
  {
    month: { type: String, required: true },
    gpa: { type: Number, required: true, min: 0, max: 10 },
    attendance: { type: Number, required: true, min: 0, max: 100 },
    score: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const StudentSchema = new Schema(
  {
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    department: { type: String, required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 8, index: true },
    section: { type: String, required: true, trim: true },
    enrollmentYear: { type: Number, required: true, min: 2018, max: 2030 },
    attendance: { type: Number, required: true, min: 0, max: 100 },
    internalMarks: { type: Number, required: true, min: 0, max: 100 },
    previousGPA: { type: Number, required: true, min: 0, max: 10 },
    assignmentCompletion: { type: Number, required: true, min: 0, max: 100 },
    weeklyStudyHours: { type: Number, required: true, min: 0, max: 45 },
    previousPerformance: { type: Number, required: true, min: 0, max: 100 },
    subjectsNeedingImprovement: { type: Number, required: true, min: 0, max: 8 },
    participationScore: { type: Number, required: true, min: 0, max: 100 },
    history: { type: [AcademicHistorySchema], default: [] },
  },
  { timestamps: true }
);

StudentSchema.index({ department: 1, semester: 1, section: 1 });

const PredictionSchema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    department: { type: String, required: true, index: true },
    semester: { type: Number, required: true },
    inputFeatures: { type: Schema.Types.Mixed, required: true },
    predictedScore: { type: Number, required: true, min: 0, max: 100 },
    predictedGrade: { type: String, required: true },
    riskCategory: {
      type: String,
      enum: ['Low Risk', 'Medium Risk', 'High Risk'],
      required: true,
      index: true,
    },
    uncertaintyBand: { type: Schema.Types.Mixed, required: true },
    featureContributions: { type: [Schema.Types.Mixed], default: [] },
    modelVersion: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

PredictionSchema.index({ studentId: 1, createdAt: -1 });

const ModelTrainingSchema = new Schema(
  {
    modelVersion: { type: String, required: true, unique: true, index: true },
    architecture: { type: Schema.Types.Mixed, required: true },
    optimizer: { type: String, required: true },
    learningRate: { type: Number, required: true },
    lossFunction: { type: String, required: true },
    epochs: { type: Number, required: true },
    batchSize: { type: Number, required: true },
    datasetSize: { type: Number, required: true },
    trainSplitSize: { type: Number, required: true },
    valSplitSize: { type: Number, required: true },
    testSplitSize: { type: Number, required: true },
    trainingLoss: { type: Number, required: true },
    validationLoss: { type: Number, required: true },
    trainingMae: { type: Number, required: true },
    validationMae: { type: Number, required: true },
    testMetrics: { type: Schema.Types.Mixed, required: true },
    epochHistory: { type: [Schema.Types.Mixed], default: [] },
    featureImportance: { type: [Schema.Types.Mixed], default: [] },
    actualVsPredicted: { type: [Schema.Types.Mixed], default: [] },
    normalizationStats: { type: Schema.Types.Mixed, required: true },
    trainingDate: { type: Date, default: Date.now },
    durationMs: { type: Number, required: true },
  },
  { timestamps: true }
);

const RecommendationSchema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    predictionId: { type: String, required: true, index: true },
    engineType: { type: String, enum: ['rule-based'], default: 'rule-based' },
    recommendations: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

const SettingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: 'global' },
    riskThresholds: {
      lowRiskMin: { type: Number, default: 70 },
      mediumRiskMin: { type: Number, default: 50 },
    },
    academicYear: { type: String, default: '2026-2027' },
    institutionName: { type: String, default: 'NeuroPredict Academic Research Institute' },
    syntheticDataDisclaimer: {
      type: String,
      default:
        'Training uses a reproducible synthetic educational dataset generated for NNDL PBL demonstration. Predictions are educational risk indicators and not validated real-world exam outcomes.',
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const StudentModel = mongoose.models.Student || mongoose.model('Student', StudentSchema);
export const PredictionModel =
  mongoose.models.Prediction || mongoose.model('Prediction', PredictionSchema);
export const ModelTrainingModel =
  mongoose.models.ModelTraining || mongoose.model('ModelTraining', ModelTrainingSchema);
export const RecommendationModel =
  mongoose.models.Recommendation || mongoose.model('Recommendation', RecommendationSchema);
export const SettingsModel =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
