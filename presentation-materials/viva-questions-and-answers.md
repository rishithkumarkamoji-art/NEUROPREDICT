# NeuroPredict — NNDL PBL Viva Preparation (32 Questions & Answers)

Concise, technically accurate answers written so a B.Tech student can explain every concept confidently during viva evaluation.

---

### 1. What is Neural Networks and Deep Learning (NNDL)?
Neural Networks are computational models inspired by biological neurons that learn patterns directly from data by adjusting numerical weights. Deep Learning refers to neural networks with multiple hidden layers capable of learning hierarchical, nonlinear feature representations automatically.

### 2. What is an Artificial Neural Network (ANN)?
An ANN is a network of interconnected mathematical nodes (neurons) arranged in layers—Input, Hidden, and Output—that maps input features to predictions through weighted sums and nonlinear activation functions.

### 3. What is a neuron (perceptron / unit)?
A neuron is the basic computational unit of an ANN. It receives inputs $x_1, \dots, x_n$, multiplies each by a weight $w_i$, adds a bias $b$ to compute $z = \sum w_i x_i + b$, and passes $z$ through an activation function $a = f(z)$.

### 4. What are weights and biases?
**Weights** determine the strength and direction (positive or negative) of each input connection. **Biases** act like an intercept term, shifting the activation curve left or right so a neuron can activate even when weighted inputs sum to zero.

### 5. What is forward propagation?
Forward propagation is the step-by-step flow of input data from the input layer through each hidden layer to the output layer to produce a prediction $\hat{y}$. In NeuroPredict: `9 inputs → 16 ReLU → 8 ReLU → 1 Sigmoid`.

### 6. What is backpropagation?
Backpropagation is the algorithm used to train neural networks. It computes the error at the output layer using the loss function and propagates gradients backward from output to input using the calculus chain rule ($\frac{\partial L}{\partial W}$) so every weight knows how much it contributed to the error.

### 7. What is gradient descent?
Gradient descent is an optimization algorithm that iteratively updates weights in the opposite direction of the loss gradient: $W_{\text{new}} = W_{\text{old}} - \alpha \frac{\partial L}{\partial W}$, gradually moving toward a minimum of the error surface.

### 8. What is an activation function?
An activation function introduces nonlinearity into a neuron's output. Without nonlinear activations, stacking multiple dense layers collapses mathematically into a single linear regression model unable to learn complex patterns.

### 9. Why is ReLU used in the hidden layers?
ReLU ($f(x) = \max(0, x)$) is computationally efficient, produces sparse activations, and avoids the vanishing gradient problem that affects Sigmoid/Tanh in hidden layers because its derivative is a constant `1` for all positive inputs.

### 10. Why is Sigmoid used in the output layer?
Sigmoid ($f(x) = \frac{1}{1 + e^{-x}}$) smoothly bounds outputs strictly between `0` and `1`. Because we normalize target academic scores from `0–100%` into `[0, 1]`, Sigmoid guarantees valid percentage predictions when multiplied back by 100.

### 11. What is an optimizer?
An optimizer is the algorithm that uses computed gradients to update network weights and biases during training (e.g., SGD, Momentum, RMSProp, Adam).

### 12. What is the Adam optimizer?
**Adam** (Adaptive Moment Estimation) combines Momentum (exponentially decaying average of past gradients) with RMSProp (exponentially decaying average of squared gradients) to compute adaptive learning rates for every parameter individually, giving fast and stable convergence at `lr = 0.001`.

### 13. What is Mean Squared Error (MSE)?
$\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2$. It measures the average squared difference between actual and predicted values. Squaring heavily penalizes large prediction mistakes, which is important when identifying high-risk students.

### 14. What is overfitting?
Overfitting occurs when a model memorizes training data and noise instead of general patterns—showing very low training loss but rising validation loss and poor test accuracy.

### 15. What is underfitting?
Underfitting occurs when a model is too simple or under-trained to capture the underlying relationship, resulting in high loss on both training and validation sets.

### 16. What is an epoch?
One epoch is one complete forward and backward pass over the entire training dataset. NeuroPredict trains for 35 epochs by default (configurable by Administrators).

### 17. What is batch size?
Batch size is the number of training samples processed before performing one weight update. NeuroPredict uses mini-batch gradient descent with a default batch size of `32` for balanced speed and gradient stability.

### 18. What is normalization, and why do we fit it only on training data?
Normalization (z-score standardization: $z = \frac{x - \mu}{\sigma}$) scales all 9 academic inputs (like GPA 0–10 vs Attendance 0–100) to comparable ranges so gradient descent converges smoothly. We compute $\mu$ and $\sigma$ **strictly on the training split** to avoid **data leakage** from validation/test sets.

### 19. What is training data?
The 70% subset of the dataset used directly by forward propagation and backpropagation to learn the 305 weights and biases.

### 20. What is validation data?
The 15% subset held out from weight updates and evaluated after each epoch to monitor generalization, detect overfitting, and calibrate our 90% split-conformal prediction interval.

### 21. What is testing data?
The final 15% completely unseen subset evaluated only after training finishes to report unbiased `MSE`, `MAE`, `RMSE`, `R²`, and permutation feature importance.

### 22. What is TensorFlow.js?
TensorFlow.js is Google's open-source JavaScript/TypeScript library for defining, training, saving, and running machine learning models directly in Node.js or the browser without requiring a Python runtime.

### 23. How does NeuroPredict make a prediction end-to-end?
The frontend validates the 9 inputs and posts to `POST /api/predictions/predict`. The Express backend validates input bounds, standardizes values using the saved training-split `means` and `stds`, executes `model.predict()` on the loaded singleton TensorFlow.js model, attaches the conformal uncertainty interval, classifies grade & risk, saves the record + rule-based recommendations, and returns JSON.

### 24. Why is synthetic data used in this project?
Real university student records are privacy-protected (FERPA/institutional policies) and unavailable for public PBL demos. Our seeded synthetic generator creates 1,200 realistic, balanced profiles with nonlinear academic interactions (attendance cliff, study-hour diminishing returns, backlog penalties) plus controlled Gaussian noise so the ANN genuinely learns patterns.

### 25. What are the limitations of the model?
Predictions are derived from synthetic educational patterns and cannot replace human faculty judgment or serve as validated real-world exam outcomes until retrained on verified longitudinal university records.

### 26. How does MongoDB store student records and predictions?
MongoDB stores structured documents across six Mongoose-validated collections (`Users`, `Students`, `Predictions`, `ModelTraining`, `Recommendations`, `Settings`) with unique indexes (`email`, `studentId`, `modelVersion`) and compound indexes for fast analytics filtering. When `MONGODB_URI` is not configured locally, the repository falls back cleanly to a persistent JSON document store.

### 27. Why did you choose the MERN stack + TensorFlow.js?
Using TypeScript/JavaScript across React, Express, Mongoose, and TensorFlow.js eliminates cross-language serialization overhead, shares validation logic (`shared/academicRules.ts`) directly between frontend and backend, and simplifies deployment to a single Node.js server.

### 28. How are authentication and authorization implemented?
Passwords are salted and hashed using `bcryptjs` (never stored in plaintext). Login issues a signed JWT token validated on protected routes by `authenticate` middleware, while `authorize(...roles)` enforces Admin/Faculty/Student permissions and record ownership checks prevent students from accessing peers' data.

### 29. How is academic risk identified?
Predicted scores (0–100%) are classified against configurable institutional thresholds (default: Low Risk ≥ 70%, Medium Risk 50–69.99%, High Risk < 50%), paired with a 90% conformal uncertainty band.

### 30. Why didn't you label the Sigmoid output as "model confidence"?
In regression, a Sigmoid output scaled by 100 represents the *predicted percentage score*, not prediction probability or certainty. Instead, NeuroPredict implements **Split-Conformal Prediction** using validation residuals to provide an honest, statistically calibrated `±halfWidth` uncertainty interval.

### 31. How is Feature Importance computed in NeuroPredict?
We compute **Permutation Feature Importance** on the held-out test set: each of the 9 input columns is randomly shuffled one at a time, and the resulting increase in test MAE directly measures how heavily the trained neural network relies on that feature.

### 32. How can this project be improved in the future?
By integrating real LMS attendance/quiz streams, adding SHAP local attributions, using LSTM networks to model multi-semester sequences, and triggering automated advisor notifications when a student transitions into High Risk.
