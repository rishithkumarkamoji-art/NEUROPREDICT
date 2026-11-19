# NeuroPredict — 7–10 Minute University PBL Slide Deck Outline

**Target Duration:** 8 minutes presentation + 2 minutes live demo  
**Subject:** Neural Networks & Deep Learning (NNDL)

---

### Slide 1: Title Slide (0:30)
- **Title:** NeuroPredict — Neural Network-Based Student Performance Prediction & Academic Risk Detection
- **Subtitle:** *Predict Early. Learn Better. Perform Smarter.*
- **Metadata:** B.Tech NNDL PBL Project · Full-Stack MERN + TensorFlow.js
- **Speaker Notes:** Introduce team members, project title, and core mission: moving academic advising from reactive post-exam reporting to proactive neural-network risk detection.

### Slide 2: Problem Statement & Motivation (0:45)
- Academic struggles are usually detected *after* semester results arrive.
- Static spreadsheets miss compounding nonlinear risk signals (e.g., low attendance + weak internal marks + subject backlogs).
- Need: An explainable, real-time early-warning platform tailored for Admins, Faculty, and Students.
- **Speaker Notes:** Emphasize why simple averages fail—dropping from 75% to 55% attendance impacts final grades much more steeply than dropping from 95% to 75%.

### Slide 3: System Architecture (1:00)
- **Frontend:** React + Vite + Tailwind CSS + Recharts (20 functional pages)
- **Backend:** Node.js + Express REST API + JWT + bcryptjs + Multer CSV
- **Database:** MongoDB + Mongoose ODM (6 indexed collections)
- **AI Engine:** TensorFlow.js Feed-Forward ANN with disk weight persistence
- **Speaker Notes:** Highlight the single-runtime advantage—no separate Python bridge needed; TensorFlow.js executes training and inference directly inside Node.js.

### Slide 4: Artificial Neural Network Architecture (1:15)
- **Topology:** `9 Inputs → 16 ReLU → 8 ReLU → 1 Sigmoid` (**305 parameters**)
- **Inputs:** Attendance, Internal Marks, Prev GPA, Assignments, Study Hours, Prev Score, Weak Subjects, Participation, Semester
- **Compilation:** Adam (`lr = 0.001`), Loss = MSE, Metrics = MAE, RMSE, R²
- **Preprocessing:** Training-only z-score normalization (70/15/15 split) to prevent data leakage
- **Speaker Notes:** Walk through parameter math: `9×16+16 = 160`, `16×8+8 = 136`, `8×1+1 = 9`, total `305`. Explain why ReLU avoids vanishing gradients in hidden layers and Sigmoid bounds the output cleanly to `[0, 1]`.

### Slide 5: Uncertainty Calibration & Feature Importance (1:00)
- **Honest Uncertainty:** A Sigmoid regression output is *not* a probability. We compute a **Split-Conformal 90% Prediction Interval** from validation residuals.
- **Explainability:** Real **Permutation Feature Importance** measured on held-out test records.
- **Rule-Based Advisor:** Transparent deterministic rules generate actionable plans—clearly separated from the ANN.
- **Speaker Notes:** Faculty and examiners appreciate scientific rigor. Emphasize that we never fake confidence scores or mislabel rule engines as a second AI model.

### Slide 6: Training Pipeline & Results (1:00)
- Deterministic seeded synthetic dataset: `1,200` balanced student records (nonlinear ground truth + Gaussian noise).
- Smooth MSE convergence across 35 epochs; validation loss tracks training loss with no overfitting.
- **Held-Out Test Metrics:** `R² ≈ 0.94`, `MAE ≈ 2.6 pts`, Empirical 90% Interval Coverage `≈ 90%`.
- **Speaker Notes:** Show the Training vs. Validation Loss curve and Actual vs. Predicted scatter plot directly from the live Model Training Dashboard.

### Slide 7: Interactive Neural Network Lab (1:00)
- Live inspection of all 305 real trained weights and neuron activations.
- Drag any of the 9 input sliders and watch ReLU activations update in real time.
- Interactive mathematical explorers for ReLU, Sigmoid, and MSE.
- **Speaker Notes:** Point out that this page turns the app into a live NNDL teaching tool—examiners can click any hidden neuron and verify `ReLU(Σ w_i x_i + b)`.

### Slide 8: Role-Based Workflows & Security (0:45)
- **Admin:** 8-chart analytics suite, CSV bulk import with preview & deduplication, live retraining, configurable risk thresholds.
- **Faculty:** Department roster with inline marks/attendance updates that immediately trigger re-prediction.
- **Student:** Private personal dashboard (strict ownership enforcement) + downloadable PDF report.
- **Speaker Notes:** Mention JWT authentication, bcrypt password hashing, Helmet security headers, and rate limiting.

### Slide 9: Live System Demonstration Plan (1:30)
1. Sign in as **Admin** → inspect 8 Recharts charts & permutation feature importance.
2. Open **Neural Network Lab** → drag Attendance slider & step through Forward/Backprop.
3. Open **Performance Prediction** → generate live TensorFlow.js prediction & download PDF report.
4. Switch to **Student** (`aarav.sharma@neuropredict.edu`) → show isolated personal dashboard.

### Slide 10: Limitations, Future Work & Conclusion (0:45)
- **Limitation:** Trained on synthetic data for PBL demonstration; real deployment requires institutional longitudinal data.
- **Future Work:** LMS integration, SHAP explainability, LSTM semester sequence modeling, automated advisor email alerts.
- **Conclusion:** Credible, explainable, end-to-end NNDL engineering ready for academic intervention.
