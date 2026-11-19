import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import { neuralNetworkService } from '../services/neuralNetwork';

test('TensorFlow.js 9-16-8-1 ANN trains, converges, saves, reloads, and predicts reproducibly', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuropredict-tf-test-'));
  neuralNetworkService.setStorageDir(tmpDir);

  try {
    const trainingRecord = await neuralNetworkService.trainModel({
      epochs: 22,
      batchSize: 32,
      learningRate: 0.002,
      datasetSize: 1000,
      seed: 77711,
    });

    // Verify exact 9 -> 16 -> 8 -> 1 architecture (9*16+16 + 16*8+8 + 8*1+1 = 160 + 136 + 9 = 305 params)
    assert.equal(trainingRecord.architecture.inputUnits, 9);
    assert.equal(trainingRecord.architecture.hiddenLayers[0].units, 16);
    assert.equal(trainingRecord.architecture.hiddenLayers[1].units, 8);
    assert.equal(trainingRecord.architecture.outputUnits, 1);
    assert.equal(trainingRecord.architecture.totalParameters, 305);

    // Verify loss actually decreased across epochs
    assert.equal(trainingRecord.epochHistory.length, 22);
    const firstLoss = trainingRecord.epochHistory[0].loss;
    const lastLoss = trainingRecord.epochHistory[trainingRecord.epochHistory.length - 1].loss;
    assert.ok(lastLoss < firstLoss, `Expected training loss to drop (${firstLoss} -> ${lastLoss})`);

    // Verify strong generalization on held-out test set
    assert.ok(
      trainingRecord.testMetrics.r2 > 0.82,
      `Expected held-out R² > 0.82, got ${trainingRecord.testMetrics.r2}`
    );
    assert.ok(
      trainingRecord.testMetrics.mae < 7.0,
      `Expected held-out MAE < 7.0, got ${trainingRecord.testMetrics.mae}`
    );

    // Verify model artifacts saved to disk
    assert.ok(fs.existsSync(path.join(tmpDir, 'model.json')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'weights.bin')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'metadata.json')));

    const strongStudent = {
      attendance: 93,
      internalMarks: 90,
      previousGPA: 9.1,
      assignmentCompletion: 95,
      weeklyStudyHours: 25,
      previousPerformance: 91,
      subjectsNeedingImprovement: 0,
      participationScore: 89,
      semester: 6,
    };

    const atRiskStudent = {
      attendance: 47,
      internalMarks: 38,
      previousGPA: 4.4,
      assignmentCompletion: 40,
      weeklyStudyHours: 5,
      previousPerformance: 43,
      subjectsNeedingImprovement: 4,
      participationScore: 35,
      semester: 6,
    };

    const predBeforeReload = await neuralNetworkService.predict(strongStudent);
    const predAtRisk = await neuralNetworkService.predict(atRiskStudent);

    assert.ok(
      predBeforeReload.predictedScore > predAtRisk.predictedScore + 30,
      `Expected strong (${predBeforeReload.predictedScore}) >> at-risk (${predAtRisk.predictedScore})`
    );

    // Reload from disk and confirm bit-for-bit reproducible prediction
    const reloadedMeta = await neuralNetworkService.loadSavedModel();
    assert.ok(reloadedMeta !== null);
    const predAfterReload = await neuralNetworkService.predict(strongStudent);
    assert.equal(predAfterReload.predictedScore, predBeforeReload.predictedScore);

    // Verify forward-pass inspection matches model prediction
    const inspection = await neuralNetworkService.inspectForwardPass(strongStudent);
    assert.equal(inspection.inputs.length, 9);
    assert.equal(inspection.hidden1.length, 16);
    assert.equal(inspection.hidden2.length, 8);
    assert.ok(
      Math.abs(inspection.output.predictedScore - predAfterReload.predictedScore) < 0.05,
      `Forward pass output (${inspection.output.predictedScore}) should match TF predict (${predAfterReload.predictedScore})`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
