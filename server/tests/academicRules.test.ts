import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyGrade,
  classifyRisk,
  computeConformalHalfWidth,
  generateRuleBasedRecommendations,
  parseAndValidateStudentCsv,
  REQUIRED_CSV_COLUMNS,
  validateAcademicFeatures,
} from '../../shared/academicRules';
import {
  computeSyntheticTargetScore,
  generateSyntheticDataset,
} from '../services/syntheticData';

test('classifyGrade maps all six academic tiers accurately', () => {
  assert.equal(classifyGrade(94.2), 'Excellent');
  assert.equal(classifyGrade(84.5), 'Very Good');
  assert.equal(classifyGrade(72.0), 'Good');
  assert.equal(classifyGrade(63.9), 'Average');
  assert.equal(classifyGrade(48.1), 'Needs Improvement');
  assert.equal(classifyGrade(32.0), 'Critical');
});

test('classifyRisk respects default and custom configurable thresholds', () => {
  assert.equal(classifyRisk(75), 'Low Risk');
  assert.equal(classifyRisk(69.99), 'Medium Risk');
  assert.equal(classifyRisk(50), 'Medium Risk');
  assert.equal(classifyRisk(49.9), 'High Risk');

  const custom = { lowRiskMin: 80, mediumRiskMin: 60 };
  assert.equal(classifyRisk(75, custom), 'Medium Risk');
  assert.equal(classifyRisk(55, custom), 'High Risk');
  assert.equal(classifyRisk(82, custom), 'Low Risk');
});

test('validateAcademicFeatures rejects out-of-range and missing values without silent fallback', () => {
  const bad = validateAcademicFeatures({
    attendance: 120,
    internalMarks: 70,
    previousGPA: 8,
    assignmentCompletion: 80,
    weeklyStudyHours: 15,
    previousPerformance: 75,
    subjectsNeedingImprovement: 0,
    participationScore: 70,
    semester: 6,
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.attendance);

  const missing = validateAcademicFeatures({ attendance: 80 });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.internalMarks);
});

test('generateRuleBasedRecommendations responds dynamically to student risk factors', () => {
  const highRiskRecs = generateRuleBasedRecommendations(
    {
      attendance: 52,
      internalMarks: 41,
      previousGPA: 4.8,
      assignmentCompletion: 45,
      weeklyStudyHours: 6,
      previousPerformance: 48,
      subjectsNeedingImprovement: 3,
      participationScore: 40,
      semester: 5,
    },
    44
  );
  assert.ok(highRiskRecs.some((r) => r.category === 'Attendance'));
  assert.ok(highRiskRecs.some((r) => r.category === 'Internal Marks'));
  assert.ok(highRiskRecs.some((r) => r.category === 'Backlog Clearance'));

  const topRecs = generateRuleBasedRecommendations(
    {
      attendance: 95,
      internalMarks: 92,
      previousGPA: 9.4,
      assignmentCompletion: 97,
      weeklyStudyHours: 26,
      previousPerformance: 93,
      subjectsNeedingImprovement: 0,
      participationScore: 91,
      semester: 6,
    },
    93
  );
  assert.equal(topRecs.length, 1);
  assert.equal(topRecs[0].category, 'Enrichment');
});

test('computeConformalHalfWidth computes 90th-percentile empirical residual quantile', () => {
  const residuals = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const hw = computeConformalHalfWidth(residuals, 0.1);
  assert.equal(hw, 5.0);
});

test('parseAndValidateStudentCsv detects missing columns, duplicates, and invalid numeric fields', () => {
  const missingColResult = parseAndValidateStudentCsv('studentId,fullName\nNP1,Test', new Set());
  assert.ok(missingColResult.missingColumns.length > 0);

  const header = REQUIRED_CSV_COLUMNS.join(',');
  const csv = [
    header,
    'NP9001,New Student,new@edu.org,Computer Science & Engineering,5,A,2024,85,80,8.2,88,18,81,0,82',
    'NP2023001,Duplicate Existing,dup@edu.org,Computer Science & Engineering,5,A,2024,85,80,8.2,88,18,81,0,82',
    'NP9002,Bad Marks,bad@edu.org,Computer Science & Engineering,5,A,2024,150,80,8.2,88,18,81,0,82',
  ].join('\n');

  const parsed = parseAndValidateStudentCsv(csv, new Set(['NP2023001']));
  assert.equal(parsed.missingColumns.length, 0);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].valid, true);
  assert.equal(parsed.rows[1].isDuplicate, true);
  assert.equal(parsed.rows[1].valid, false);
  assert.equal(parsed.rows[2].valid, false);
});

test('synthetic dataset generator is deterministic and correlates positively with inputs', () => {
  const ds1 = generateSyntheticDataset(1000, 12345);
  const ds2 = generateSyntheticDataset(1000, 12345);
  assert.equal(ds1.length, 1000);
  assert.deepEqual(ds1[0], ds2[0]);
  assert.deepEqual(ds1[999], ds2[999]);

  const highScore = computeSyntheticTargetScore({
    attendance: 94,
    internalMarks: 91,
    previousGPA: 9.2,
    assignmentCompletion: 95,
    weeklyStudyHours: 26,
    previousPerformance: 92,
    subjectsNeedingImprovement: 0,
    participationScore: 90,
    semester: 6,
  });
  const lowScore = computeSyntheticTargetScore({
    attendance: 48,
    internalMarks: 38,
    previousGPA: 4.5,
    assignmentCompletion: 42,
    weeklyStudyHours: 5,
    previousPerformance: 44,
    subjectsNeedingImprovement: 4,
    participationScore: 36,
    semester: 6,
  });
  assert.ok(highScore > lowScore + 35, `Expected high (${highScore}) >> low (${lowScore})`);
});
