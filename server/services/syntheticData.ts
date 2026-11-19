import type { AcademicFeatures, AcademicHistoryPoint, StudentRecord } from '../../shared/types.ts';
import { DEPARTMENTS, SECTIONS } from '../../shared/academicRules.ts';

export interface SyntheticRecord {
  features: AcademicFeatures;
  targetScore: number; // 0-100 ground-truth synthetic final score
  department: string;
}

/**
 * Deterministic Mulberry32 PRNG for reproducible synthetic academic datasets.
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianNoise(rng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Computes a realistic nonlinear target academic score from the 9 academic inputs
 * plus controlled Gaussian noise. Used solely for synthetic educational dataset generation.
 */
export function computeSyntheticTargetScore(
  f: AcademicFeatures,
  noise = 0
): number {
  // Nonlinear study-hours curve (diminishing returns beyond ~28 hrs/week)
  const studyEffect = 14.5 * (1 - Math.exp(-f.weeklyStudyHours / 13.5));

  // Attendance penalty drops sharply below 70%
  const attendanceBase = 0.21 * f.attendance;
  const attendancePenalty = f.attendance < 68 ? -0.28 * Math.pow(68 - f.attendance, 1.12) : 0;

  // Core academic signals
  const internalEffect = 0.27 * f.internalMarks;
  const gpaEffect = 1.65 * f.previousGPA; // up to 16.5
  const assignmentEffect = 0.13 * f.assignmentCompletion;
  const prevPerfEffect = 0.11 * f.previousPerformance;
  const participationEffect = 0.06 * f.participationScore;

  // Synergy interaction: high attendance + strong internal marks amplifies mastery
  const synergy =
    0.045 * ((f.attendance - 50) / 50) * ((f.internalMarks - 50) / 50) * 100;

  // Nonlinear penalty for subjects requiring improvement (backlogs/weak subjects)
  const backlogPenalty = -2.9 * Math.pow(f.subjectsNeedingImprovement, 1.18);

  // Subtle curriculum load effect across semesters (sem 5-7 slightly tougher)
  const semesterEffect = -0.35 * Math.sin(((f.semester - 1) / 7) * Math.PI);

  const rawScore =
    5.5 +
    attendanceBase +
    attendancePenalty +
    internalEffect +
    gpaEffect +
    assignmentEffect +
    studyEffect +
    prevPerfEffect +
    participationEffect +
    synergy +
    backlogPenalty +
    semesterEffect +
    noise;

  return Number(clamp(rawScore, 12, 99.2).toFixed(2));
}

/**
 * Generates a reproducible, balanced synthetic dataset of at least 1,200 student records
 * across Critical, Needs Improvement, Average, Good, Very Good, and Excellent tiers.
 */
export function generateSyntheticDataset(
  count = 1200,
  seed = 20260417
): SyntheticRecord[] {
  const rng = createSeededRng(seed);
  const records: SyntheticRecord[] = [];

  // Stratified latent ability archetypes ensure balanced representation across all performance & risk bands
  const archetypes = [
    { weight: 0.14, center: 0.22, spread: 0.12 }, // High Risk / Critical
    { weight: 0.22, center: 0.45, spread: 0.13 }, // Medium-High Risk / Needs Improvement
    { weight: 0.28, center: 0.65, spread: 0.12 }, // Average / Good
    { weight: 0.22, center: 0.80, spread: 0.10 }, // Very Good
    { weight: 0.14, center: 0.92, spread: 0.07 }, // Excellent
  ];

  const cumulativeWeights: number[] = [];
  let acc = 0;
  for (const a of archetypes) {
    acc += a.weight;
    cumulativeWeights.push(acc);
  }

  for (let i = 0; i < count; i++) {
    const r = rng();
    const archIdx = cumulativeWeights.findIndex((cw) => r <= cw);
    const arch = archetypes[archIdx === -1 ? archetypes.length - 1 : archIdx];

    const latent = clamp(arch.center + gaussianNoise(rng, 0, arch.spread), 0.05, 0.99);

    const attendance = Number(
      clamp(35 + latent * 62 + gaussianNoise(rng, 0, 8.5), 25, 100).toFixed(1)
    );
    const internalMarks = Number(
      clamp(18 + latent * 78 + gaussianNoise(rng, 0, 7.5), 10, 100).toFixed(1)
    );
    const previousGPA = Number(
      clamp(2.4 + latent * 7.2 + gaussianNoise(rng, 0, 0.75), 1.5, 10).toFixed(2)
    );
    const assignmentCompletion = Number(
      clamp(22 + latent * 76 + gaussianNoise(rng, 0, 9.5), 10, 100).toFixed(1)
    );
    const weeklyStudyHours = Number(
      clamp(2.5 + latent * 29 + gaussianNoise(rng, 0, 4.5), 1, 42).toFixed(1)
    );
    const previousPerformance = Number(
      clamp(25 + latent * 70 + gaussianNoise(rng, 0, 7.5), 15, 100).toFixed(1)
    );
    const subjectsNeedingImprovement = Math.round(
      clamp((1 - latent) * 5.2 + gaussianNoise(rng, 0, 0.9), 0, 7)
    );
    const participationScore = Number(
      clamp(20 + latent * 75 + gaussianNoise(rng, 0, 10), 10, 100).toFixed(1)
    );
    const semester = Math.floor(rng() * 8) + 1;

    const features: AcademicFeatures = {
      attendance,
      internalMarks,
      previousGPA,
      assignmentCompletion,
      weeklyStudyHours,
      previousPerformance,
      subjectsNeedingImprovement,
      participationScore,
      semester,
    };

    const noise = gaussianNoise(rng, 0, 2.35);
    const targetScore = computeSyntheticTargetScore(features, noise);
    const department = DEPARTMENTS[Math.floor(rng() * DEPARTMENTS.length)];

    records.push({ features, targetScore, department });
  }

  return records;
}

/**
 * Creates 24 named demo students covering every department, semester, and risk tier.
 */
export function buildDemoStudents(): Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>[] {
  const rng = createSeededRng(90421);
  const profiles: Array<{
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
  }> = [
    {
      studentId: 'NP2023001',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 6,
      section: 'A',
      enrollmentYear: 2023,
      attendance: 88,
      internalMarks: 84,
      previousGPA: 8.6,
      assignmentCompletion: 92,
      weeklyStudyHours: 22,
      previousPerformance: 85,
      subjectsNeedingImprovement: 0,
      participationScore: 86,
    },
    {
      studentId: 'NP2023002',
      fullName: 'Diya Nair',
      email: 'diya.nair@neuropredict.edu',
      department: 'Artificial Intelligence & Data Science',
      semester: 6,
      section: 'A',
      enrollmentYear: 2023,
      attendance: 95,
      internalMarks: 93,
      previousGPA: 9.4,
      assignmentCompletion: 98,
      weeklyStudyHours: 28,
      previousPerformance: 94,
      subjectsNeedingImprovement: 0,
      participationScore: 92,
    },
    {
      studentId: 'NP2023003',
      fullName: 'Rohan Verma',
      email: 'rohan.verma@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 6,
      section: 'B',
      enrollmentYear: 2023,
      attendance: 58,
      internalMarks: 46,
      previousGPA: 5.4,
      assignmentCompletion: 52,
      weeklyStudyHours: 7,
      previousPerformance: 51,
      subjectsNeedingImprovement: 3,
      participationScore: 44,
    },
    {
      studentId: 'NP2023004',
      fullName: 'Meera Krishnan',
      email: 'meera.krishnan@neuropredict.edu',
      department: 'Electronics & Communication',
      semester: 5,
      section: 'A',
      enrollmentYear: 2024,
      attendance: 79,
      internalMarks: 71,
      previousGPA: 7.4,
      assignmentCompletion: 80,
      weeklyStudyHours: 16,
      previousPerformance: 73,
      subjectsNeedingImprovement: 1,
      participationScore: 76,
    },
    {
      studentId: 'NP2023005',
      fullName: 'Kabir Malhotra',
      email: 'kabir.malhotra@neuropredict.edu',
      department: 'Mechanical Engineering',
      semester: 4,
      section: 'B',
      enrollmentYear: 2024,
      attendance: 64,
      internalMarks: 57,
      previousGPA: 6.1,
      assignmentCompletion: 63,
      weeklyStudyHours: 11,
      previousPerformance: 59,
      subjectsNeedingImprovement: 2,
      participationScore: 55,
    },
    {
      studentId: 'NP2023006',
      fullName: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@neuropredict.edu',
      department: 'Artificial Intelligence & Data Science',
      semester: 7,
      section: 'A',
      enrollmentYear: 2022,
      attendance: 91,
      internalMarks: 87,
      previousGPA: 8.9,
      assignmentCompletion: 94,
      weeklyStudyHours: 24,
      previousPerformance: 88,
      subjectsNeedingImprovement: 0,
      participationScore: 89,
    },
    {
      studentId: 'NP2023007',
      fullName: 'Vikramaditya Rao',
      email: 'vikram.rao@neuropredict.edu',
      department: 'Civil Engineering',
      semester: 6,
      section: 'C',
      enrollmentYear: 2023,
      attendance: 48,
      internalMarks: 39,
      previousGPA: 4.6,
      assignmentCompletion: 41,
      weeklyStudyHours: 5,
      previousPerformance: 44,
      subjectsNeedingImprovement: 4,
      participationScore: 38,
    },
    {
      studentId: 'NP2023008',
      fullName: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 5,
      section: 'A',
      enrollmentYear: 2024,
      attendance: 84,
      internalMarks: 78,
      previousGPA: 8.1,
      assignmentCompletion: 86,
      weeklyStudyHours: 19,
      previousPerformance: 80,
      subjectsNeedingImprovement: 0,
      participationScore: 82,
    },
    {
      studentId: 'NP2023009',
      fullName: 'Arjun Menon',
      email: 'arjun.menon@neuropredict.edu',
      department: 'Electronics & Communication',
      semester: 7,
      section: 'B',
      enrollmentYear: 2022,
      attendance: 72,
      internalMarks: 63,
      previousGPA: 6.7,
      assignmentCompletion: 70,
      weeklyStudyHours: 13,
      previousPerformance: 66,
      subjectsNeedingImprovement: 1,
      participationScore: 68,
    },
    {
      studentId: 'NP2023010',
      fullName: 'Priya Chatterjee',
      email: 'priya.chatterjee@neuropredict.edu',
      department: 'Artificial Intelligence & Data Science',
      semester: 4,
      section: 'A',
      enrollmentYear: 2024,
      attendance: 93,
      internalMarks: 90,
      previousGPA: 9.1,
      assignmentCompletion: 96,
      weeklyStudyHours: 26,
      previousPerformance: 91,
      subjectsNeedingImprovement: 0,
      participationScore: 90,
    },
    {
      studentId: 'NP2023011',
      fullName: 'Siddharth Joshi',
      email: 'siddharth.joshi@neuropredict.edu',
      department: 'Mechanical Engineering',
      semester: 6,
      section: 'A',
      enrollmentYear: 2023,
      attendance: 53,
      internalMarks: 43,
      previousGPA: 5.0,
      assignmentCompletion: 47,
      weeklyStudyHours: 6.5,
      previousPerformance: 48,
      subjectsNeedingImprovement: 4,
      participationScore: 42,
    },
    {
      studentId: 'NP2023012',
      fullName: 'Ishita Banerjee',
      email: 'ishita.banerjee@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 8,
      section: 'A',
      enrollmentYear: 2022,
      attendance: 89,
      internalMarks: 86,
      previousGPA: 8.8,
      assignmentCompletion: 90,
      weeklyStudyHours: 23,
      previousPerformance: 87,
      subjectsNeedingImprovement: 0,
      participationScore: 85,
    },
    {
      studentId: 'NP2023013',
      fullName: 'Nikhil Reddy',
      email: 'nikhil.reddy@neuropredict.edu',
      department: 'Electronics & Communication',
      semester: 3,
      section: 'C',
      enrollmentYear: 2025,
      attendance: 69,
      internalMarks: 60,
      previousGPA: 6.4,
      assignmentCompletion: 66,
      weeklyStudyHours: 12,
      previousPerformance: 62,
      subjectsNeedingImprovement: 2,
      participationScore: 61,
    },
    {
      studentId: 'NP2023014',
      fullName: 'Tanvi Agarwal',
      email: 'tanvi.agarwal@neuropredict.edu',
      department: 'Civil Engineering',
      semester: 5,
      section: 'B',
      enrollmentYear: 2024,
      attendance: 82,
      internalMarks: 75,
      previousGPA: 7.8,
      assignmentCompletion: 84,
      weeklyStudyHours: 18,
      previousPerformance: 77,
      subjectsNeedingImprovement: 0,
      participationScore: 79,
    },
    {
      studentId: 'NP2023015',
      fullName: 'Devansh Kapoor',
      email: 'devansh.kapoor@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 4,
      section: 'B',
      enrollmentYear: 2024,
      attendance: 44,
      internalMarks: 34,
      previousGPA: 4.1,
      assignmentCompletion: 35,
      weeklyStudyHours: 4,
      previousPerformance: 39,
      subjectsNeedingImprovement: 5,
      participationScore: 31,
    },
    {
      studentId: 'NP2023016',
      fullName: 'Ritika Sen',
      email: 'ritika.sen@neuropredict.edu',
      department: 'Artificial Intelligence & Data Science',
      semester: 6,
      section: 'B',
      enrollmentYear: 2023,
      attendance: 76,
      internalMarks: 68,
      previousGPA: 7.1,
      assignmentCompletion: 74,
      weeklyStudyHours: 15,
      previousPerformance: 70,
      subjectsNeedingImprovement: 1,
      participationScore: 72,
    },
    {
      studentId: 'NP2023017',
      fullName: 'Harshvardhan Patel',
      email: 'harsh.patel@neuropredict.edu',
      department: 'Mechanical Engineering',
      semester: 7,
      section: 'A',
      enrollmentYear: 2022,
      attendance: 86,
      internalMarks: 80,
      previousGPA: 8.2,
      assignmentCompletion: 88,
      weeklyStudyHours: 20,
      previousPerformance: 81,
      subjectsNeedingImprovement: 0,
      participationScore: 80,
    },
    {
      studentId: 'NP2023018',
      fullName: 'Kavya Subramanian',
      email: 'kavya.subramanian@neuropredict.edu',
      department: 'Electronics & Communication',
      semester: 6,
      section: 'A',
      enrollmentYear: 2023,
      attendance: 94,
      internalMarks: 91,
      previousGPA: 9.2,
      assignmentCompletion: 95,
      weeklyStudyHours: 27,
      previousPerformance: 92,
      subjectsNeedingImprovement: 0,
      participationScore: 93,
    },
    {
      studentId: 'NP2023019',
      fullName: 'Manav Gupta',
      email: 'manav.gupta@neuropredict.edu',
      department: 'Civil Engineering',
      semester: 4,
      section: 'A',
      enrollmentYear: 2024,
      attendance: 62,
      internalMarks: 54,
      previousGPA: 5.9,
      assignmentCompletion: 60,
      weeklyStudyHours: 10,
      previousPerformance: 56,
      subjectsNeedingImprovement: 2,
      participationScore: 53,
    },
    {
      studentId: 'NP2023020',
      fullName: 'Nandini Iyer',
      email: 'nandini.iyer@neuropredict.edu',
      department: 'Computer Science & Engineering',
      semester: 3,
      section: 'A',
      enrollmentYear: 2025,
      attendance: 90,
      internalMarks: 85,
      previousGPA: 8.7,
      assignmentCompletion: 91,
      weeklyStudyHours: 22,
      previousPerformance: 86,
      subjectsNeedingImprovement: 0,
      participationScore: 88,
    },
    {
      studentId: 'NP2023021',
      fullName: 'Pranav Gokhale',
      email: 'pranav.gokhale@neuropredict.edu',
      department: 'Artificial Intelligence & Data Science',
      semester: 5,
      section: 'C',
      enrollmentYear: 2024,
      attendance: 55,
      internalMarks: 48,
      previousGPA: 5.3,
      assignmentCompletion: 50,
      weeklyStudyHours: 8,
      previousPerformance: 52,
      subjectsNeedingImprovement: 3,
      participationScore: 47,
    },
    {
      studentId: 'NP2023022',
      fullName: 'Aditi Saxena',
      email: 'aditi.saxena@neuropredict.edu',
      department: 'Electronics & Communication',
      semester: 4,
      section: 'B',
      enrollmentYear: 2024,
      attendance: 78,
      internalMarks: 72,
      previousGPA: 7.5,
      assignmentCompletion: 79,
      weeklyStudyHours: 16.5,
      previousPerformance: 74,
      subjectsNeedingImprovement: 1,
      participationScore: 74,
    },
    {
      studentId: 'NP2023023',
      fullName: 'Yashwant Thakur',
      email: 'yashwant.thakur@neuropredict.edu',
      department: 'Mechanical Engineering',
      semester: 5,
      section: 'C',
      enrollmentYear: 2024,
      attendance: 67,
      internalMarks: 59,
      previousGPA: 6.3,
      assignmentCompletion: 65,
      weeklyStudyHours: 11.5,
      previousPerformance: 61,
      subjectsNeedingImprovement: 2,
      participationScore: 58,
    },
    {
      studentId: 'NP2023024',
      fullName: 'Shruti Bhatia',
      email: 'shruti.bhatia@neuropredict.edu',
      department: 'Civil Engineering',
      semester: 8,
      section: 'A',
      enrollmentYear: 2022,
      attendance: 87,
      internalMarks: 82,
      previousGPA: 8.4,
      assignmentCompletion: 89,
      weeklyStudyHours: 21,
      previousPerformance: 83,
      subjectsNeedingImprovement: 0,
      participationScore: 84,
    },
  ];

  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  return profiles.map((p) => {
    const history: AcademicHistoryPoint[] = months.map((month, idx) => {
      const progress = (idx - 4) * 1.1;
      const jitter = (rng() - 0.5) * 2.2;
      const score = Number(clamp(p.previousPerformance + progress + jitter, 20, 99).toFixed(1));
      const gpa = Number(clamp(p.previousGPA + progress * 0.08 + jitter * 0.06, 2.0, 10.0).toFixed(2));
      const attendance = Number(clamp(p.attendance + (idx - 4) * 0.8 + jitter, 30, 100).toFixed(1));
      return { month, gpa, attendance, score };
    });

    return {
      ...p,
      section: SECTIONS.includes(p.section as (typeof SECTIONS)[number]) ? p.section : 'A',
      history,
    };
  });
}
