import type {
  AcademicFeatures,
  GradeCategory,
  RecommendationItem,
  RiskCategory,
} from './types.ts';

export interface FeatureMeta {
  key: keyof AcademicFeatures;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  unit: string;
  step: number;
  higherIsBetter: boolean;
}

export const FEATURE_METADATA: FeatureMeta[] = [
  {
    key: 'attendance',
    label: 'Attendance Percentage',
    shortLabel: 'Attendance',
    min: 0,
    max: 100,
    unit: '%',
    step: 1,
    higherIsBetter: true,
  },
  {
    key: 'internalMarks',
    label: 'Internal Exam Marks',
    shortLabel: 'Internal Marks',
    min: 0,
    max: 100,
    unit: '/100',
    step: 1,
    higherIsBetter: true,
  },
  {
    key: 'previousGPA',
    label: 'Previous Semester GPA',
    shortLabel: 'Prev GPA',
    min: 0,
    max: 10,
    unit: '/10',
    step: 0.1,
    higherIsBetter: true,
  },
  {
    key: 'assignmentCompletion',
    label: 'Assignment Completion',
    shortLabel: 'Assignments',
    min: 0,
    max: 100,
    unit: '%',
    step: 1,
    higherIsBetter: true,
  },
  {
    key: 'weeklyStudyHours',
    label: 'Weekly Study Hours',
    shortLabel: 'Study Hrs',
    min: 0,
    max: 45,
    unit: 'hrs/wk',
    step: 0.5,
    higherIsBetter: true,
  },
  {
    key: 'previousPerformance',
    label: 'Previous Academic Score',
    shortLabel: 'Prev Score',
    min: 0,
    max: 100,
    unit: '%',
    step: 1,
    higherIsBetter: true,
  },
  {
    key: 'subjectsNeedingImprovement',
    label: 'Subjects Needing Improvement',
    shortLabel: 'Weak Subjects',
    min: 0,
    max: 8,
    unit: 'subjects',
    step: 1,
    higherIsBetter: false,
  },
  {
    key: 'participationScore',
    label: 'Class Participation Score',
    shortLabel: 'Participation',
    min: 0,
    max: 100,
    unit: '/100',
    step: 1,
    higherIsBetter: true,
  },
  {
    key: 'semester',
    label: 'Current Semester',
    shortLabel: 'Semester',
    min: 1,
    max: 8,
    unit: 'Sem',
    step: 1,
    higherIsBetter: true,
  },
];

export const FEATURE_ORDER: (keyof AcademicFeatures)[] = FEATURE_METADATA.map((f) => f.key);

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
] as const;

export const SECTIONS = ['A', 'B', 'C'] as const;

export const DEFAULT_RISK_THRESHOLDS = {
  lowRiskMin: 70,
  mediumRiskMin: 50,
};

export function featureObjectToArray(features: AcademicFeatures): number[] {
  return FEATURE_ORDER.map((key) => {
    const val = Number(features[key]);
    if (!Number.isFinite(val)) return 0;
    const meta = FEATURE_METADATA.find((m) => m.key === key)!;
    return Math.min(meta.max, Math.max(meta.min, val));
  });
}

export function validateAcademicFeatures(input: Partial<AcademicFeatures>): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: AcademicFeatures;
} {
  const errors: Record<string, string> = {};
  const sanitized = {} as AcademicFeatures;

  for (const meta of FEATURE_METADATA) {
    const raw = input[meta.key];
    if (raw === undefined || raw === null || raw === ('' as unknown as number)) {
      errors[meta.key] = `${meta.label} is required.`;
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      errors[meta.key] = `${meta.label} must be a valid number.`;
      continue;
    }
    if (num < meta.min || num > meta.max) {
      errors[meta.key] = `${meta.label} must be between ${meta.min} and ${meta.max}.`;
      continue;
    }
    sanitized[meta.key] = num;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: Object.keys(errors).length === 0 ? sanitized : undefined,
  };
}

export function classifyGrade(score: number): GradeCategory {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 90) return 'Excellent';
  if (clamped >= 80) return 'Very Good';
  if (clamped >= 70) return 'Good';
  if (clamped >= 60) return 'Average';
  if (clamped >= 40) return 'Needs Improvement';
  return 'Critical';
}

export function classifyRisk(
  score: number,
  thresholds: { lowRiskMin: number; mediumRiskMin: number } = DEFAULT_RISK_THRESHOLDS
): RiskCategory {
  if (score >= thresholds.lowRiskMin) return 'Low Risk';
  if (score >= thresholds.mediumRiskMin) return 'Medium Risk';
  return 'High Risk';
}

/**
 * Computes empirical split-conformal 90% prediction interval half-width from absolute validation residuals.
 * This provides a statistically grounded uncertainty interval rather than mislabeling a sigmoid output as probability.
 */
export function computeConformalHalfWidth(absResiduals: number[], alpha = 0.1): number {
  if (absResiduals.length === 0) return 5.0;
  const sorted = [...absResiduals].sort((a, b) => a - b);
  const n = sorted.length;
  const qIndex = Math.min(n - 1, Math.max(0, Math.ceil((n + 1) * (1 - alpha)) - 1));
  return Number(Math.max(1.5, sorted[qIndex]).toFixed(2));
}

/**
 * Deterministic rule-based academic recommendation engine.
 * Explicitly separated from the TensorFlow.js neural network model.
 */
export function generateRuleBasedRecommendations(
  features: AcademicFeatures,
  predictedScore: number,
  thresholds: { lowRiskMin: number; mediumRiskMin: number } = DEFAULT_RISK_THRESHOLDS
): RecommendationItem[] {
  const recs: RecommendationItem[] = [];
  let seq = 1;
  const nextId = () => `rec-${seq++}`;

  if (features.attendance < 75) {
    recs.push({
      id: nextId(),
      category: 'Attendance',
      priority: features.attendance < 60 ? 'High' : 'Medium',
      title: 'Rebuild Consistent Class Attendance',
      actionPlan:
        'Follow a fixed weekly timetable targeting at least 85% attendance over the next 4 weeks. Coordinate with faculty to review missed lecture notes and lab demonstrations.',
      triggerReason: `Current attendance is ${features.attendance.toFixed(1)}%, below the 75% academic threshold.`,
    });
  }

  if (features.internalMarks < 65) {
    recs.push({
      id: nextId(),
      category: 'Internal Marks',
      priority: features.internalMarks < 50 ? 'High' : 'Medium',
      title: 'Targeted Internal Assessment Recovery',
      actionPlan:
        'Schedule weekly faculty office hours, solve previous 3 semesters of internal test papers under timed conditions, and review high-weightage conceptual topics first.',
      triggerReason: `Internal marks are ${features.internalMarks.toFixed(1)}/100, indicating gaps in core unit mastery.`,
    });
  }

  if (features.assignmentCompletion < 75) {
    recs.push({
      id: nextId(),
      category: 'Assignments',
      priority: features.assignmentCompletion < 55 ? 'High' : 'Medium',
      title: 'Structured Assignment Submission Plan',
      actionPlan:
        'Break pending coursework into 45-minute milestones due 48 hours before official deadlines. Prioritize graded lab records and problem sets to recover continuous evaluation marks.',
      triggerReason: `Assignment completion is ${features.assignmentCompletion.toFixed(1)}%, leaving continuous assessment points uncaptured.`,
    });
  }

  if (features.weeklyStudyHours < 14) {
    recs.push({
      id: nextId(),
      category: 'Study Routine',
      priority: features.weeklyStudyHours < 8 ? 'High' : 'Medium',
      title: 'Establish a Realistic Daily Study Cadence',
      actionPlan:
        'Increase self-study to 2.5–3 hours/day (18+ hours/week) using spaced repetition and active recall blocks rather than pre-exam cramming.',
      triggerReason: `Logged weekly study time is ${features.weeklyStudyHours.toFixed(1)} hours, below the recommended 14–20 hours.`,
    });
  }

  if (features.previousGPA < 6.5 || features.previousPerformance < 60) {
    recs.push({
      id: nextId(),
      category: 'GPA Recovery',
      priority: features.previousGPA < 5.5 ? 'High' : 'Medium',
      title: 'Subject-Wise Foundational Reinforcement',
      actionPlan:
        'Audit prerequisite concepts from prior semesters that carry forward into current courses and pair with a peer study group or departmental tutor.',
      triggerReason: `Prior GPA (${features.previousGPA.toFixed(2)}/10) and prior score (${features.previousPerformance.toFixed(1)}%) signal foundational drag.`,
    });
  }

  if (features.subjectsNeedingImprovement >= 2) {
    recs.push({
      id: nextId(),
      category: 'Backlog Clearance',
      priority: features.subjectsNeedingImprovement >= 3 ? 'High' : 'Medium',
      title: 'Prioritized Subject Remediation Track',
      actionPlan: `Create a dedicated 6-week remediation tracker for the ${features.subjectsNeedingImprovement} flagged subjects, allocating 60% of revision hours to the two lowest-scoring courses.`,
      triggerReason: `${features.subjectsNeedingImprovement} subjects currently require focused improvement.`,
    });
  }

  if (features.participationScore < 60) {
    recs.push({
      id: nextId(),
      category: 'Participation',
      priority: 'Low',
      title: 'Increase Interactive Seminar & Lab Engagement',
      actionPlan:
        'Prepare at least two concept questions before each lecture and actively lead one lab exercise or tutorial walkthrough per fortnight.',
      triggerReason: `Class participation score is ${features.participationScore.toFixed(0)}/100.`,
    });
  }

  if (predictedScore >= thresholds.lowRiskMin && recs.length === 0) {
    recs.push({
      id: nextId(),
      category: 'Enrichment',
      priority: 'Low',
      title: 'Pursue Research Projects & Peer Mentorship',
      actionPlan:
        'Maintain current study consistency while stretching into faculty-guided research seminars, competitive coding/design tracks, or peer mentoring for medium-risk classmates.',
      triggerReason: `Strong projected performance (${predictedScore.toFixed(1)}%) with balanced academic indicators.`,
    });
  } else if (predictedScore >= 82 && recs.length <= 1) {
    recs.push({
      id: nextId(),
      category: 'Enrichment',
      priority: 'Low',
      title: 'Target Honors Distinction & Capstone Depth',
      actionPlan:
        'Channel surplus study momentum into publishing a technical paper or building an open-source portfolio artifact aligned with your specialization.',
      triggerReason: `Projected score of ${predictedScore.toFixed(1)}% places performance in the Very Good/Excellent band.`,
    });
  }

  return recs;
}

export interface ParsedCsvRow {
  rowNumber: number;
  valid: boolean;
  isDuplicate: boolean;
  errors: string[];
  data: {
    studentId: string;
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
  };
}

export const REQUIRED_CSV_COLUMNS = [
  'studentId',
  'fullName',
  'email',
  'department',
  'semester',
  'section',
  'enrollmentYear',
  'attendance',
  'internalMarks',
  'previousGPA',
  'assignmentCompletion',
  'weeklyStudyHours',
  'previousPerformance',
  'subjectsNeedingImprovement',
  'participationScore',
] as const;

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseAndValidateStudentCsv(
  csvText: string,
  existingStudentIds: Set<string>
): {
  missingColumns: string[];
  rows: ParsedCsvRow[];
} {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { missingColumns: [...REQUIRED_CSV_COLUMNS], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const missingColumns = REQUIRED_CSV_COLUMNS.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { missingColumns, rows: [] };
  }

  const colIdx = new Map<string, number>();
  headers.forEach((h, idx) => colIdx.set(h, idx));

  const seenInCsv = new Set<string>();
  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const get = (k: string) => cols[colIdx.get(k) ?? -1] ?? '';

    const studentId = get('studentId');
    const fullName = get('fullName');
    const email = get('email');
    const department = get('department');
    const section = get('section') || 'A';
    const semester = Number(get('semester'));
    const enrollmentYear = Number(get('enrollmentYear'));
    const attendance = Number(get('attendance'));
    const internalMarks = Number(get('internalMarks'));
    const previousGPA = Number(get('previousGPA'));
    const assignmentCompletion = Number(get('assignmentCompletion'));
    const weeklyStudyHours = Number(get('weeklyStudyHours'));
    const previousPerformance = Number(get('previousPerformance'));
    const subjectsNeedingImprovement = Number(get('subjectsNeedingImprovement'));
    const participationScore = Number(get('participationScore'));

    const errors: string[] = [];
    if (!studentId) errors.push('Missing studentId');
    if (!fullName) errors.push('Missing fullName');
    if (!email || !email.includes('@')) errors.push('Invalid email');
    if (!department) errors.push('Missing department');
    if (!Number.isFinite(enrollmentYear) || enrollmentYear < 2018 || enrollmentYear > 2030) {
      errors.push('Invalid enrollmentYear');
    }

    const featCheck = validateAcademicFeatures({
      attendance,
      internalMarks,
      previousGPA,
      assignmentCompletion,
      weeklyStudyHours,
      previousPerformance,
      subjectsNeedingImprovement,
      participationScore,
      semester,
    });
    if (!featCheck.valid) {
      errors.push(...Object.values(featCheck.errors));
    }

    const isDuplicate =
      Boolean(studentId) &&
      (existingStudentIds.has(studentId.toUpperCase()) || seenInCsv.has(studentId.toUpperCase()));
    if (studentId) seenInCsv.add(studentId.toUpperCase());

    rows.push({
      rowNumber: i + 1,
      valid: errors.length === 0 && !isDuplicate,
      isDuplicate,
      errors,
      data: {
        studentId,
        fullName,
        email,
        department,
        semester,
        section,
        enrollmentYear,
        attendance,
        internalMarks,
        previousGPA,
        assignmentCompletion,
        weeklyStudyHours,
        previousPerformance,
        subjectsNeedingImprovement,
        participationScore,
      },
    });
  }

  return { missingColumns: [], rows };
}
