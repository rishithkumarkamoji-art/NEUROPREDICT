import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import type {
  ModelTrainingRecord,
  PredictionRecord,
  RecommendationRecord,
  StudentRecord,
  SystemSettings,
  UserRecord,
} from '../../shared/types';
import { DEFAULT_RISK_THRESHOLDS } from '../../shared/academicRules';
import {
  ModelTrainingModel,
  PredictionModel,
  RecommendationModel,
  SettingsModel,
  StudentModel,
  UserModel,
} from '../models/schemas';

interface LocalDbSnapshot {
  users: UserRecord[];
  students: StudentRecord[];
  predictions: PredictionRecord[];
  modelTrainings: ModelTrainingRecord[];
  recommendations: RecommendationRecord[];
  settings: SystemSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  riskThresholds: { ...DEFAULT_RISK_THRESHOLDS },
  academicYear: '2026-2027',
  institutionName: 'NeuroPredict Academic Research Institute',
  syntheticDataDisclaimer:
    'The neural network is trained on a reproducible synthetic educational dataset (1,200 records) for NNDL PBL academic demonstration. Predictions must not be interpreted as validated real-world exam outcomes.',
};

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

class DataStore {
  private useMongo = false;
  private storageDetail = 'Initializing...';
  private localFilePath = path.resolve(process.cwd(), 'data/neuropredict-db.json');
  private localData: LocalDbSnapshot = {
    users: [],
    students: [],
    predictions: [],
    modelTrainings: [],
    recommendations: [],
    settings: { ...DEFAULT_SETTINGS },
  };

  public getStorageInfo() {
    return {
      mode: this.useMongo ? 'mongodb' : 'local-json-fallback',
      detail: this.storageDetail,
      mongoConnected: this.useMongo && mongoose.connection.readyState === 1,
    };
  }

  public async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (mongoUri && !mongoUri.includes('MY_')) {
      try {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 2500,
          connectTimeoutMS: 2500,
        });
        this.useMongo = true;
        this.storageDetail = 'Connected to MongoDB via Mongoose ODM';
        mongoose.connection.on('disconnected', () => {
          console.warn('[NeuroPredict] MongoDB disconnected.');
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[NeuroPredict] MongoDB unreachable (${msg}). Falling back to persistent local JSON document store.`
        );
      }
    }

    this.useMongo = false;
    this.storageDetail =
      'Local persistent JSON document store (set MONGODB_URI to connect MongoDB Atlas or local mongod)';
    this.loadLocalFile();
  }

  private loadLocalFile() {
    const dir = path.dirname(this.localFilePath);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(this.localFilePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.localFilePath, 'utf-8')) as Partial<LocalDbSnapshot>;
        this.localData = {
          users: parsed.users ?? [],
          students: parsed.students ?? [],
          predictions: parsed.predictions ?? [],
          modelTrainings: parsed.modelTrainings ?? [],
          recommendations: parsed.recommendations ?? [],
          settings: parsed.settings ?? { ...DEFAULT_SETTINGS },
        };
        return;
      } catch {
        // Recreate cleanly if corrupted
      }
    }
    this.persistLocalFile();
  }

  private persistLocalFile() {
    if (this.useMongo) return;
    const dir = path.dirname(this.localFilePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.localFilePath, JSON.stringify(this.localData, null, 2), 'utf-8');
  }

  // -------------------- USERS --------------------
  public async listUsers(): Promise<UserRecord[]> {
    if (this.useMongo) {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        name: d.name,
        email: d.email,
        passwordHash: d.passwordHash,
        role: d.role,
        department: d.department,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return [...this.localData.users];
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    if (this.useMongo) {
      const d: any = await UserModel.findOne({ email: normalized }).lean();
      if (!d) return null;
      return {
        id: String(d._id),
        name: d.name,
        email: d.email,
        passwordHash: d.passwordHash,
        role: d.role,
        department: d.department,
        createdAt: new Date(d.createdAt).toISOString(),
      };
    }
    return this.localData.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    if (this.useMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const d: any = await UserModel.findById(id).lean();
      if (!d) return null;
      return {
        id: String(d._id),
        name: d.name,
        email: d.email,
        passwordHash: d.passwordHash,
        role: d.role,
        department: d.department,
        createdAt: new Date(d.createdAt).toISOString(),
      };
    }
    return this.localData.users.find((u) => u.id === id) ?? null;
  }

  public async createUser(input: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (this.useMongo) {
      const created: any = await UserModel.create({ ...input, email });
      return {
        id: String(created._id),
        name: created.name,
        email: created.email,
        passwordHash: created.passwordHash,
        role: created.role,
        department: created.department,
        createdAt: new Date(created.createdAt).toISOString(),
      };
    }

    const record: UserRecord = {
      ...input,
      email,
      id: makeId('usr'),
      createdAt: new Date().toISOString(),
    };
    this.localData.users.unshift(record);
    this.persistLocalFile();
    return record;
  }

  public async updateUser(
    id: string,
    patch: Partial<Pick<UserRecord, 'name' | 'role' | 'department' | 'passwordHash'>>
  ): Promise<UserRecord | null> {
    if (this.useMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const updated: any = await UserModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      if (!updated) return null;
      return {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        passwordHash: updated.passwordHash,
        role: updated.role,
        department: updated.department,
        createdAt: new Date(updated.createdAt).toISOString(),
      };
    }
    const idx = this.localData.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.localData.users[idx] = { ...this.localData.users[idx], ...patch };
    this.persistLocalFile();
    return this.localData.users[idx];
  }

  public async deleteUser(id: string): Promise<boolean> {
    if (this.useMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return false;
      const res = await UserModel.findByIdAndDelete(id);
      return Boolean(res);
    }
    const before = this.localData.users.length;
    this.localData.users = this.localData.users.filter((u) => u.id !== id);
    if (this.localData.users.length !== before) {
      this.persistLocalFile();
      return true;
    }
    return false;
  }

  // -------------------- STUDENTS --------------------
  private mapStudentDoc(d: any): StudentRecord {
    return {
      id: String(d._id ?? d.id),
      studentId: d.studentId,
      userId: d.userId ? String(d.userId) : undefined,
      fullName: d.fullName,
      email: d.email,
      department: d.department,
      semester: Number(d.semester),
      section: d.section,
      enrollmentYear: Number(d.enrollmentYear),
      attendance: Number(d.attendance),
      internalMarks: Number(d.internalMarks),
      previousGPA: Number(d.previousGPA),
      assignmentCompletion: Number(d.assignmentCompletion),
      weeklyStudyHours: Number(d.weeklyStudyHours),
      previousPerformance: Number(d.previousPerformance),
      subjectsNeedingImprovement: Number(d.subjectsNeedingImprovement),
      participationScore: Number(d.participationScore),
      history: d.history ?? [],
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    };
  }

  public async listStudents(): Promise<StudentRecord[]> {
    if (this.useMongo) {
      const docs = await StudentModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d) => this.mapStudentDoc(d));
    }
    return [...this.localData.students];
  }

  public async findStudentByIdOrCode(idOrCode: string): Promise<StudentRecord | null> {
    if (this.useMongo) {
      const query: any = mongoose.Types.ObjectId.isValid(idOrCode)
        ? { $or: [{ _id: idOrCode }, { studentId: idOrCode.toUpperCase() }] }
        : { studentId: idOrCode.toUpperCase() };
      const d = await StudentModel.findOne(query).lean();
      return d ? this.mapStudentDoc(d) : null;
    }
    return (
      this.localData.students.find(
        (s) => s.id === idOrCode || s.studentId.toUpperCase() === idOrCode.toUpperCase()
      ) ?? null
    );
  }

  public async findStudentByUserOrEmail(userId: string, email: string): Promise<StudentRecord | null> {
    const normEmail = email.toLowerCase().trim();
    if (this.useMongo) {
      const conds: any[] = [{ email: normEmail }];
      if (mongoose.Types.ObjectId.isValid(userId)) {
        conds.unshift({ userId });
      }
      const d = await StudentModel.findOne({ $or: conds }).lean();
      return d ? this.mapStudentDoc(d) : null;
    }
    return (
      this.localData.students.find(
        (s) => s.userId === userId || s.email.toLowerCase() === normEmail
      ) ?? null
    );
  }

  public async createStudent(
    input: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StudentRecord> {
    const code = input.studentId.toUpperCase().trim();
    const existing = await this.findStudentByIdOrCode(code);
    if (existing) {
      throw new Error(`Student ID ${code} already exists.`);
    }

    const now = new Date().toISOString();
    if (this.useMongo) {
      const created = await StudentModel.create({
        ...input,
        studentId: code,
        email: input.email.toLowerCase().trim(),
      });
      return this.mapStudentDoc(created.toObject());
    }

    const record: StudentRecord = {
      ...input,
      studentId: code,
      email: input.email.toLowerCase().trim(),
      id: makeId('stu'),
      createdAt: now,
      updatedAt: now,
    };
    this.localData.students.unshift(record);
    this.persistLocalFile();
    return record;
  }

  public async updateStudent(
    idOrCode: string,
    patch: Partial<Omit<StudentRecord, 'id' | 'createdAt'>>
  ): Promise<StudentRecord | null> {
    if (this.useMongo) {
      const existing = await this.findStudentByIdOrCode(idOrCode);
      if (!existing) return null;
      const updated = await StudentModel.findByIdAndUpdate(
        existing.id,
        { ...patch, updatedAt: new Date() },
        { new: true }
      ).lean();
      return updated ? this.mapStudentDoc(updated) : null;
    }
    const idx = this.localData.students.findIndex(
      (s) => s.id === idOrCode || s.studentId.toUpperCase() === idOrCode.toUpperCase()
    );
    if (idx === -1) return null;
    this.localData.students[idx] = {
      ...this.localData.students[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.persistLocalFile();
    return this.localData.students[idx];
  }

  public async deleteStudent(idOrCode: string): Promise<boolean> {
    if (this.useMongo) {
      const existing = await this.findStudentByIdOrCode(idOrCode);
      if (!existing) return false;
      await StudentModel.findByIdAndDelete(existing.id);
      return true;
    }
    const before = this.localData.students.length;
    this.localData.students = this.localData.students.filter(
      (s) => s.id !== idOrCode && s.studentId.toUpperCase() !== idOrCode.toUpperCase()
    );
    if (this.localData.students.length !== before) {
      this.persistLocalFile();
      return true;
    }
    return false;
  }

  // -------------------- PREDICTIONS --------------------
  private mapPredictionDoc(d: any): PredictionRecord {
    return {
      id: String(d._id ?? d.id),
      studentId: d.studentId,
      studentName: d.studentName,
      department: d.department,
      semester: Number(d.semester),
      inputFeatures: d.inputFeatures,
      predictedScore: Number(d.predictedScore),
      predictedGrade: d.predictedGrade,
      riskCategory: d.riskCategory,
      uncertaintyBand: d.uncertaintyBand,
      featureContributions: d.featureContributions ?? [],
      modelVersion: d.modelVersion,
      createdBy: d.createdBy,
      createdAt: new Date(d.createdAt).toISOString(),
    };
  }

  public async listPredictions(studentId?: string): Promise<PredictionRecord[]> {
    if (this.useMongo) {
      const filter = studentId ? { studentId: studentId.toUpperCase() } : {};
      const docs = await PredictionModel.find(filter).sort({ createdAt: -1 }).lean();
      return docs.map((d) => this.mapPredictionDoc(d));
    }
    const all = studentId
      ? this.localData.predictions.filter(
          (p) => p.studentId.toUpperCase() === studentId.toUpperCase()
        )
      : this.localData.predictions;
    return [...all].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async findPredictionById(id: string): Promise<PredictionRecord | null> {
    if (this.useMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const d = await PredictionModel.findById(id).lean();
      return d ? this.mapPredictionDoc(d) : null;
    }
    return this.localData.predictions.find((p) => p.id === id) ?? null;
  }

  public async createPrediction(
    input: Omit<PredictionRecord, 'id' | 'createdAt'>
  ): Promise<PredictionRecord> {
    if (this.useMongo) {
      const created = await PredictionModel.create(input);
      return this.mapPredictionDoc(created.toObject());
    }
    const record: PredictionRecord = {
      ...input,
      id: makeId('pred'),
      createdAt: new Date().toISOString(),
    };
    this.localData.predictions.unshift(record);
    this.persistLocalFile();
    return record;
  }

  // -------------------- RECOMMENDATIONS --------------------
  public async saveRecommendation(
    input: Omit<RecommendationRecord, 'id' | 'createdAt'>
  ): Promise<RecommendationRecord> {
    if (this.useMongo) {
      const created: any = await RecommendationModel.create(input);
      return {
        id: String(created._id),
        studentId: created.studentId,
        predictionId: created.predictionId,
        engineType: 'rule-based',
        recommendations: created.recommendations,
        createdAt: new Date(created.createdAt).toISOString(),
      };
    }
    const record: RecommendationRecord = {
      ...input,
      id: makeId('rec'),
      createdAt: new Date().toISOString(),
    };
    this.localData.recommendations.unshift(record);
    this.persistLocalFile();
    return record;
  }

  public async listRecommendations(studentId?: string): Promise<RecommendationRecord[]> {
    if (this.useMongo) {
      const filter = studentId ? { studentId: studentId.toUpperCase() } : {};
      const docs = await RecommendationModel.find(filter).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: String(d._id),
        studentId: d.studentId,
        predictionId: d.predictionId,
        engineType: 'rule-based',
        recommendations: d.recommendations,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    const all = studentId
      ? this.localData.recommendations.filter(
          (r) => r.studentId.toUpperCase() === studentId.toUpperCase()
        )
      : this.localData.recommendations;
    return [...all];
  }

  // -------------------- MODEL TRAINING HISTORY --------------------
  public async saveModelTraining(record: ModelTrainingRecord): Promise<ModelTrainingRecord> {
    if (this.useMongo) {
      await ModelTrainingModel.findOneAndUpdate(
        { modelVersion: record.modelVersion },
        { ...record, trainingDate: new Date(record.trainingDate) },
        { upsert: true, new: true }
      );
      return record;
    }
    const existingIdx = this.localData.modelTrainings.findIndex(
      (m) => m.modelVersion === record.modelVersion
    );
    if (existingIdx >= 0) {
      this.localData.modelTrainings[existingIdx] = record;
    } else {
      this.localData.modelTrainings.unshift(record);
    }
    this.persistLocalFile();
    return record;
  }

  public async listModelTrainings(): Promise<ModelTrainingRecord[]> {
    if (this.useMongo) {
      const docs = await ModelTrainingModel.find().sort({ trainingDate: -1 }).lean();
      return docs.map((d: any) => ({
        ...d,
        id: String(d._id),
        trainingDate: new Date(d.trainingDate).toISOString(),
      }));
    }
    return [...this.localData.modelTrainings];
  }

  // -------------------- SETTINGS --------------------
  public async getSettings(): Promise<SystemSettings> {
    if (this.useMongo) {
      let doc: any = await SettingsModel.findOne({ key: 'global' }).lean();
      if (!doc) {
        doc = await SettingsModel.create({ key: 'global', ...DEFAULT_SETTINGS });
      }
      return {
        riskThresholds: doc.riskThresholds,
        academicYear: doc.academicYear,
        institutionName: doc.institutionName,
        syntheticDataDisclaimer: doc.syntheticDataDisclaimer,
      };
    }
    return { ...this.localData.settings };
  }

  public async updateSettings(patch: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const merged: SystemSettings = {
      ...current,
      ...patch,
      riskThresholds: {
        ...current.riskThresholds,
        ...(patch.riskThresholds ?? {}),
      },
    };
    if (this.useMongo) {
      await SettingsModel.findOneAndUpdate(
        { key: 'global' },
        { key: 'global', ...merged },
        { upsert: true, new: true }
      );
      return merged;
    }
    this.localData.settings = merged;
    this.persistLocalFile();
    return merged;
  }
}

export const dataStore = new DataStore();
