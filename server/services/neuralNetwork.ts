import * as tf from '@tensorflow/tfjs';
import fs from 'fs';
import path from 'path';
import type {
  AcademicFeatures,
  ActualVsPredictedPoint,
  EpochMetric,
  FeatureContribution,
  FeatureImportanceItem,
  ForwardPassInspection,
  ModelTrainingRecord,
  NormalizationStats,
} from '../../shared/types';
import {
  computeConformalHalfWidth,
  FEATURE_METADATA,
  FEATURE_ORDER,
  featureObjectToArray,
} from '../../shared/academicRules';
import { createSeededRng, generateSyntheticDataset } from './syntheticData';

const DEFAULT_MODEL_DIR = path.resolve(
  process.cwd(),
  process.env.MODEL_STORAGE_DIR || 'server/saved-model'
);

interface SavedModelMetadata {
  trainingRecord: ModelTrainingRecord;
}

class NeuralNetworkService {
  private model: tf.Sequential | null = null;
  private metadata: ModelTrainingRecord | null = null;
  private isTraining = false;
  private storageDir = DEFAULT_MODEL_DIR;

  public setStorageDir(dir: string) {
    this.storageDir = dir;
  }

  public getStatus() {
    return {
      loaded: this.model !== null && this.metadata !== null,
      isTraining: this.isTraining,
      modelVersion: this.metadata?.modelVersion ?? null,
      lastTrainedAt: this.metadata?.trainingDate ?? null,
      storagePath: this.storageDir,
      backend: tf.getBackend(),
      metadata: this.metadata,
    };
  }

  public getMetadata(): ModelTrainingRecord | null {
    return this.metadata;
  }

  /**
   * Loads an existing trained TensorFlow.js model from disk, or trains & saves an initial model if absent.
   */
  public async initialize(): Promise<ModelTrainingRecord> {
    if (this.model && this.metadata) {
      return this.metadata;
    }

    const loaded = await this.loadSavedModel();
    if (loaded) {
      return loaded;
    }

    // Train initial model deterministically on 1,200 synthetic student records
    return this.trainModel({
      epochs: 35,
      batchSize: 32,
      learningRate: 0.001,
      datasetSize: 1200,
      seed: 20260417,
    });
  }

  /**
   * Builds the exact 9 -> 16 (ReLU) -> 8 (ReLU) -> 1 (Sigmoid) Feed-Forward ANN.
   */
  private buildArchitecture(learningRate: number): tf.Sequential {
    const model = tf.sequential({ name: 'NeuroPredict_ANN' });

    model.add(
      tf.layers.dense({
        name: 'hidden_layer_1',
        inputShape: [9],
        units: 16,
        activation: 'relu',
        kernelInitializer: tf.initializers.heNormal({ seed: 42 }),
        biasInitializer: 'zeros',
      })
    );

    model.add(
      tf.layers.dense({
        name: 'hidden_layer_2',
        units: 8,
        activation: 'relu',
        kernelInitializer: tf.initializers.heNormal({ seed: 43 }),
        biasInitializer: 'zeros',
      })
    );

    model.add(
      tf.layers.dense({
        name: 'output_layer',
        units: 1,
        activation: 'sigmoid',
        kernelInitializer: tf.initializers.glorotUniform({ seed: 44 }),
        biasInitializer: 'zeros',
      })
    );

    model.compile({
      optimizer: tf.train.adam(learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    return model;
  }

  /**
   * Computes z-score normalization statistics STRICTLY on the training split to prevent data leakage.
   */
  private computeNormalizationStats(trainMatrix: number[][]): NormalizationStats {
    const numFeatures = FEATURE_ORDER.length;
    const n = trainMatrix.length;
    const means = new Array<number>(numFeatures).fill(0);
    const mins = new Array<number>(numFeatures).fill(Infinity);
    const maxs = new Array<number>(numFeatures).fill(-Infinity);

    for (const row of trainMatrix) {
      for (let j = 0; j < numFeatures; j++) {
        means[j] += row[j];
        if (row[j] < mins[j]) mins[j] = row[j];
        if (row[j] > maxs[j]) maxs[j] = row[j];
      }
    }
    for (let j = 0; j < numFeatures; j++) {
      means[j] /= n;
    }

    const variances = new Array<number>(numFeatures).fill(0);
    for (const row of trainMatrix) {
      for (let j = 0; j < numFeatures; j++) {
        const diff = row[j] - means[j];
        variances[j] += diff * diff;
      }
    }
    const stds = variances.map((v) => {
      const s = Math.sqrt(v / n);
      return s < 1e-6 ? 1 : s;
    });

    return {
      featureOrder: [...FEATURE_ORDER],
      means,
      stds,
      mins,
      maxs,
    };
  }

  private normalizeMatrix(matrix: number[][], stats: NormalizationStats): number[][] {
    return matrix.map((row) =>
      row.map((val, j) => (val - stats.means[j]) / stats.stds[j])
    );
  }

  /**
   * Trains a fresh TensorFlow.js neural network with 70/15/15 train/val/test split,
   * computes real test-set metrics, conformal uncertainty interval, and permutation feature importance,
   * then atomically swaps and saves the model to disk.
   */
  public async trainModel(options?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    datasetSize?: number;
    seed?: number;
    extraRecords?: { features: AcademicFeatures; targetScore: number }[];
  }): Promise<ModelTrainingRecord> {
    if (this.isTraining) {
      throw new Error('Model training is already in progress.');
    }

    this.isTraining = true;
    const startedAt = Date.now();

    try {
      const epochs = Math.max(5, Math.min(120, Math.round(options?.epochs ?? 35)));
      const batchSize = Math.max(8, Math.min(128, Math.round(options?.batchSize ?? 32)));
      const learningRate = Math.max(0.0001, Math.min(0.05, Number(options?.learningRate ?? 0.001)));
      const datasetSize = Math.max(1000, Math.min(3000, Math.round(options?.datasetSize ?? 1200)));
      const seed = options?.seed ?? 20260417;

      const synthetic = generateSyntheticDataset(datasetSize, seed);
      const allRecords = [
        ...synthetic.map((r) => ({ features: r.features, targetScore: r.targetScore })),
        ...(options?.extraRecords ?? []),
      ];

      // Deterministic Fisher-Yates shuffle
      const rng = createSeededRng(seed + 101);
      for (let i = allRecords.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [allRecords[i], allRecords[j]] = [allRecords[j], allRecords[i]];
      }

      const totalCount = allRecords.length;
      const trainEnd = Math.floor(totalCount * 0.7);
      const valEnd = Math.floor(totalCount * 0.85);

      const trainSlice = allRecords.slice(0, trainEnd);
      const valSlice = allRecords.slice(trainEnd, valEnd);
      const testSlice = allRecords.slice(valEnd);

      const rawTrainX = trainSlice.map((r) => featureObjectToArray(r.features));
      const rawValX = valSlice.map((r) => featureObjectToArray(r.features));
      const rawTestX = testSlice.map((r) => featureObjectToArray(r.features));

      // Fit normalization ONLY on training split
      const normStats = this.computeNormalizationStats(rawTrainX);
      const normTrainX = this.normalizeMatrix(rawTrainX, normStats);
      const normValX = this.normalizeMatrix(rawValX, normStats);
      const normTestX = this.normalizeMatrix(rawTestX, normStats);

      // Targets normalized to [0, 1] for Sigmoid output layer
      const trainYArr = trainSlice.map((r) => [r.targetScore / 100]);
      const valYArr = valSlice.map((r) => [r.targetScore / 100]);
      const testYActual = testSlice.map((r) => r.targetScore);

      const xTrain = tf.tensor2d(normTrainX);
      const yTrain = tf.tensor2d(trainYArr);
      const xVal = tf.tensor2d(normValX);
      const yVal = tf.tensor2d(valYArr);
      const xTest = tf.tensor2d(normTestX);

      const newModel = this.buildArchitecture(learningRate);
      const epochHistory: EpochMetric[] = [];

      try {
        await newModel.fit(xTrain, yTrain, {
          epochs,
          batchSize,
          validationData: [xVal, yVal],
          shuffle: true,
          verbose: 0,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              epochHistory.push({
                epoch: epoch + 1,
                loss: Number((logs?.loss ?? 0).toFixed(6)),
                valLoss: Number((logs?.val_loss ?? 0).toFixed(6)),
                mae: Number(((logs?.mae ?? 0) * 100).toFixed(3)),
                valMae: Number(((logs?.val_mae ?? 0) * 100).toFixed(3)),
              });
            },
          },
        });

        // Compute validation residuals for split-conformal 90% uncertainty calibration
        const valPredTensor = newModel.predict(xVal) as tf.Tensor;
        const valPredVals = Array.from(await valPredTensor.data()).map((v) => v * 100);
        valPredTensor.dispose();

        const valAbsResiduals = valSlice.map((r, idx) => Math.abs(r.targetScore - valPredVals[idx]));
        const conformalHalfWidth = computeConformalHalfWidth(valAbsResiduals, 0.1);

        // Evaluate on held-out test set
        const testPredTensor = newModel.predict(xTest) as tf.Tensor;
        const testPredVals = Array.from(await testPredTensor.data()).map((v) =>
          Number((v * 100).toFixed(2))
        );
        testPredTensor.dispose();

        const nTest = testYActual.length;
        let sumSqErr = 0;
        let sumAbsErr = 0;
        let coveredCount = 0;
        const meanActual = testYActual.reduce((s, v) => s + v, 0) / nTest;
        let ssTot = 0;

        const actualVsPredicted: ActualVsPredictedPoint[] = [];
        for (let i = 0; i < nTest; i++) {
          const actual = testYActual[i];
          const pred = testPredVals[i];
          const err = pred - actual;
          sumSqErr += err * err;
          sumAbsErr += Math.abs(err);
          ssTot += Math.pow(actual - meanActual, 2);
          if (Math.abs(err) <= conformalHalfWidth) {
            coveredCount++;
          }
          if (i < 60) {
            actualVsPredicted.push({
              index: i + 1,
              actual: Number(actual.toFixed(1)),
              predicted: Number(pred.toFixed(1)),
              error: Number(err.toFixed(2)),
            });
          }
        }

        const testMse = sumSqErr / nTest;
        const testMae = sumAbsErr / nTest;
        const testRmse = Math.sqrt(testMse);
        const testR2 = ssTot > 0 ? 1 - sumSqErr / ssTot : 0;
        const empiricalCoveragePct = Number(((coveredCount / nTest) * 100).toFixed(1));

        // Real permutation feature importance on held-out test data
        const featureImportance = await this.computePermutationFeatureImportance(
          newModel,
          normTestX,
          testYActual,
          testMae,
          seed + 555
        );

        const lastEpoch = epochHistory[epochHistory.length - 1];
        const nextVersionNum = this.metadata
          ? Number(this.metadata.modelVersion.replace(/^v1\./, '')) + 1
          : 0;
        const modelVersion = `v1.${Number.isFinite(nextVersionNum) ? nextVersionNum : 0}`;

        const trainingRecord: ModelTrainingRecord = {
          id: `train-${Date.now()}`,
          modelVersion,
          architecture: {
            inputUnits: 9,
            hiddenLayers: [
              { units: 16, activation: 'relu' },
              { units: 8, activation: 'relu' },
            ],
            outputUnits: 1,
            outputActivation: 'sigmoid',
            totalParameters: newModel.countParams(),
          },
          optimizer: 'Adam',
          learningRate,
          lossFunction: 'Mean Squared Error (MSE)',
          epochs,
          batchSize,
          datasetSize: totalCount,
          trainSplitSize: trainSlice.length,
          valSplitSize: valSlice.length,
          testSplitSize: testSlice.length,
          trainingLoss: lastEpoch?.loss ?? 0,
          validationLoss: lastEpoch?.valLoss ?? 0,
          trainingMae: lastEpoch?.mae ?? 0,
          validationMae: lastEpoch?.valMae ?? 0,
          testMetrics: {
            mse: Number(testMse.toFixed(3)),
            mae: Number(testMae.toFixed(3)),
            rmse: Number(testRmse.toFixed(3)),
            r2: Number(testR2.toFixed(4)),
            conformalHalfWidth,
            empiricalCoveragePct,
          },
          epochHistory,
          featureImportance,
          actualVsPredicted,
          normalizationStats: normStats,
          trainingDate: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
        };

        // Safe swap: dispose previous model only after the new one is fully validated
        const oldModel = this.model;
        this.model = newModel;
        this.metadata = trainingRecord;
        if (oldModel) {
          oldModel.dispose();
        }

        await this.saveCurrentModel();
        return trainingRecord;
      } finally {
        xTrain.dispose();
        yTrain.dispose();
        xVal.dispose();
        yVal.dispose();
        xTest.dispose();
      }
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Computes true permutation feature importance on held-out test data:
   * for each of the 9 input features, shuffles that column and measures MAE degradation.
   */
  private async computePermutationFeatureImportance(
    model: tf.Sequential,
    normTestX: number[][],
    testYActual: number[],
    baselineMae: number,
    seed: number
  ): Promise<FeatureImportanceItem[]> {
    const rng = createSeededRng(seed);
    const n = normTestX.length;
    const rawDeltas: { feature: keyof AcademicFeatures; label: string; maeDelta: number }[] = [];

    for (let col = 0; col < FEATURE_ORDER.length; col++) {
      const permIndices = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [permIndices[i], permIndices[j]] = [permIndices[j], permIndices[i]];
      }

      const permuted = normTestX.map((row, rowIdx) => {
        const copy = [...row];
        copy[col] = normTestX[permIndices[rowIdx]][col];
        return copy;
      });

      const xPerm = tf.tensor2d(permuted);
      const predTensor = model.predict(xPerm) as tf.Tensor;
      const preds = Array.from(await predTensor.data()).map((v) => v * 100);
      xPerm.dispose();
      predTensor.dispose();

      let absErrSum = 0;
      for (let i = 0; i < n; i++) {
        absErrSum += Math.abs(preds[i] - testYActual[i]);
      }
      const permMae = absErrSum / n;
      const maeDelta = Math.max(0.01, permMae - baselineMae);
      rawDeltas.push({
        feature: FEATURE_ORDER[col],
        label: FEATURE_METADATA[col].shortLabel,
        maeDelta: Number(maeDelta.toFixed(3)),
      });
    }

    const totalDelta = rawDeltas.reduce((s, d) => s + d.maeDelta, 0) || 1;
    return rawDeltas
      .map((d) => ({
        feature: d.feature,
        label: d.label,
        maeDelta: d.maeDelta,
        importance: Number(((d.maeDelta / totalDelta) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Saves TensorFlow.js model artifacts (model.json + weights.bin + metadata.json)
   * using a custom Node filesystem IOHandler (compatible with pure @tensorflow/tfjs).
   */
  public async saveCurrentModel(): Promise<void> {
    if (!this.model || !this.metadata) return;
    fs.mkdirSync(this.storageDir, { recursive: true });

    const modelJsonPath = path.join(this.storageDir, 'model.json');
    const weightsPath = path.join(this.storageDir, 'weights.bin');
    const metadataPath = path.join(this.storageDir, 'metadata.json');

    await this.model.save(
      tf.io.withSaveHandler(async (artifacts) => {
        const weightBuffer = artifacts.weightData
          ? Buffer.from(
              artifacts.weightData instanceof ArrayBuffer
                ? artifacts.weightData
                : new Uint8Array(
                    (artifacts.weightData as ArrayBuffer[]).reduce((acc, buf) => {
                      const merged = new Uint8Array(acc.byteLength + buf.byteLength);
                      merged.set(acc, 0);
                      merged.set(new Uint8Array(buf), acc.byteLength);
                      return merged;
                    }, new Uint8Array(0))
                  ).buffer
            )
          : Buffer.alloc(0);

        fs.writeFileSync(weightsPath, weightBuffer);
        fs.writeFileSync(
          modelJsonPath,
          JSON.stringify(
            {
              modelTopology: artifacts.modelTopology,
              weightSpecs: artifacts.weightSpecs,
              format: artifacts.format,
              generatedBy: artifacts.generatedBy,
              convertedBy: artifacts.convertedBy,
            },
            null,
            2
          ),
          'utf-8'
        );

        return {
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON',
            weightDataBytes: weightBuffer.byteLength,
          },
        };
      })
    );

    const metaPayload: SavedModelMetadata = { trainingRecord: this.metadata };
    fs.writeFileSync(metadataPath, JSON.stringify(metaPayload, null, 2), 'utf-8');
  }

  /**
   * Reloads saved TensorFlow.js model weights, topology, and training metadata from disk.
   */
  public async loadSavedModel(): Promise<ModelTrainingRecord | null> {
    const modelJsonPath = path.join(this.storageDir, 'model.json');
    const weightsPath = path.join(this.storageDir, 'weights.bin');
    const metadataPath = path.join(this.storageDir, 'metadata.json');

    if (
      !fs.existsSync(modelJsonPath) ||
      !fs.existsSync(weightsPath) ||
      !fs.existsSync(metadataPath)
    ) {
      return null;
    }

    try {
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
      const weightBuf = fs.readFileSync(weightsPath);
      const weightArrayBuffer = weightBuf.buffer.slice(
        weightBuf.byteOffset,
        weightBuf.byteOffset + weightBuf.byteLength
      );
      const metaPayload = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as SavedModelMetadata;

      const loadedLayersModel = await tf.loadLayersModel(
        tf.io.fromMemory({
          modelTopology: modelJson.modelTopology,
          weightSpecs: modelJson.weightSpecs,
          weightData: weightArrayBuffer,
        })
      );

      loadedLayersModel.compile({
        optimizer: tf.train.adam(metaPayload.trainingRecord.learningRate || 0.001),
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });

      if (this.model) {
        this.model.dispose();
      }
      this.model = loadedLayersModel as tf.Sequential;
      this.metadata = metaPayload.trainingRecord;
      return this.metadata;
    } catch {
      return null;
    }
  }

  /**
   * Generates a reproducible neural network prediction with calibrated conformal interval
   * and per-student feature contribution breakdown.
   */
  public async predict(features: AcademicFeatures): Promise<{
    predictedScore: number;
    uncertaintyBand: {
      lowerBound: number;
      upperBound: number;
      halfWidth: number;
      method: string;
      calibrationCoveragePct: number;
    };
    featureContributions: FeatureContribution[];
    modelVersion: string;
  }> {
    if (!this.model || !this.metadata) {
      await this.initialize();
    }

    const model = this.model!;
    const meta = this.metadata!;
    const rawVec = featureObjectToArray(features);
    const normVec = rawVec.map(
      (v, j) => (v - meta.normalizationStats.means[j]) / meta.normalizationStats.stds[j]
    );

    const inputTensor = tf.tensor2d([normVec]);
    const predTensor = model.predict(inputTensor) as tf.Tensor;
    const rawSigmoid = (await predTensor.data())[0];
    inputTensor.dispose();
    predTensor.dispose();

    const predictedScore = Number(Math.max(0, Math.min(100, rawSigmoid * 100)).toFixed(2));
    const halfWidth = meta.testMetrics.conformalHalfWidth;

    const importanceMap = new Map(
      meta.featureImportance.map((f) => [f.feature, f.importance])
    );

    const featureContributions: FeatureContribution[] = FEATURE_METADATA.map((fMeta, idx) => {
      const z = normVec[idx];
      const alignedZ = fMeta.higherIsBetter ? z : -z;
      const impactDirection: 'positive' | 'negative' | 'neutral' =
        alignedZ > 0.25 ? 'positive' : alignedZ < -0.25 ? 'negative' : 'neutral';
      return {
        feature: fMeta.key,
        label: fMeta.shortLabel,
        value: rawVec[idx],
        normalizedValue: Number(z.toFixed(3)),
        importancePct: importanceMap.get(fMeta.key) ?? 0,
        impactDirection,
      };
    }).sort((a, b) => b.importancePct - a.importancePct);

    return {
      predictedScore,
      uncertaintyBand: {
        lowerBound: Number(Math.max(0, predictedScore - halfWidth).toFixed(1)),
        upperBound: Number(Math.min(100, predictedScore + halfWidth).toFixed(1)),
        halfWidth,
        method: 'Split-Conformal 90% Prediction Interval (Validation Residuals)',
        calibrationCoveragePct: meta.testMetrics.empiricalCoveragePct,
      },
      featureContributions,
      modelVersion: meta.modelVersion,
    };
  }

  /**
   * Performs an exact layer-by-layer forward propagation pass using the real trained weights
   * and biases of the active TensorFlow.js model for the Neural Network Lab visualizer.
   */
  public async inspectForwardPass(features: AcademicFeatures): Promise<ForwardPassInspection> {
    if (!this.model || !this.metadata) {
      await this.initialize();
    }

    const model = this.model!;
    const meta = this.metadata!;
    const rawVec = featureObjectToArray(features);
    const normVec = rawVec.map(
      (v, j) => (v - meta.normalizationStats.means[j]) / meta.normalizationStats.stds[j]
    );

    const [l1, l2, l3] = model.layers;
    const [w1T, b1T] = l1.getWeights();
    const [w2T, b2T] = l2.getWeights();
    const [w3T, b3T] = l3.getWeights();

    const w1 = (await w1T.array()) as number[][]; // 9 x 16
    const b1 = (await b1T.array()) as number[]; // 16
    const w2 = (await w2T.array()) as number[][]; // 16 x 8
    const b2 = (await b2T.array()) as number[]; // 8
    const w3 = (await w3T.array()) as number[][]; // 8 x 1
    const b3 = (await b3T.array()) as number[]; // 1

    const hidden1 = Array.from({ length: 16 }, (_, j) => {
      let sum = b1[j];
      for (let i = 0; i < 9; i++) {
        sum += normVec[i] * w1[i][j];
      }
      return {
        index: j,
        preActivation: Number(sum.toFixed(4)),
        activation: Number(Math.max(0, sum).toFixed(4)), // ReLU
        bias: Number(b1[j].toFixed(4)),
      };
    });

    const hidden2 = Array.from({ length: 8 }, (_, j) => {
      let sum = b2[j];
      for (let i = 0; i < 16; i++) {
        sum += hidden1[i].activation * w2[i][j];
      }
      return {
        index: j,
        preActivation: Number(sum.toFixed(4)),
        activation: Number(Math.max(0, sum).toFixed(4)), // ReLU
        bias: Number(b2[j].toFixed(4)),
      };
    });

    let outSum = b3[0];
    for (let i = 0; i < 8; i++) {
      outSum += hidden2[i].activation * w3[i][0];
    }
    const sigmoid = 1 / (1 + Math.exp(-outSum));

    return {
      modelVersion: meta.modelVersion,
      inputs: FEATURE_METADATA.map((f, i) => ({
        feature: f.key,
        label: f.shortLabel,
        raw: rawVec[i],
        normalized: Number(normVec[i].toFixed(3)),
      })),
      hidden1,
      hidden2,
      output: {
        preActivation: Number(outSum.toFixed(4)),
        sigmoid: Number(sigmoid.toFixed(5)),
        predictedScore: Number((sigmoid * 100).toFixed(2)),
        bias: Number(b3[0].toFixed(4)),
      },
      weights: {
        inputToHidden1: w1.map((row) => row.map((v) => Number(v.toFixed(3)))),
        hidden1ToHidden2: w2.map((row) => row.map((v) => Number(v.toFixed(3)))),
        hidden2ToOutput: w3.map((row) => row.map((v) => Number(v.toFixed(3)))),
      },
    };
  }
}

export const neuralNetworkService = new NeuralNetworkService();
