"""
train_model.py

End-to-end training pipeline for heart disease risk prediction.
Run directly:
    python train_model.py

What this script does:
1. Load dataset
2. Clean and validate data
3. Train/test split (80/20, random_state=42)
4. Standardize features with StandardScaler
5. Train and compare LogisticRegression, RandomForest, XGBoost
6. Calibrate selected best model with CalibratedClassifierCV (sigmoid)
7. Evaluate (Accuracy, Precision, Recall, F1, Confusion Matrix)
8. Cross validation (cv=5)
9. Run 5 synthetic test cases
10. Save heart_model.pkl and scaler.pkl
11. Expose predict_heart_risk(data) for app/API integration
"""

from __future__ import annotations

import os
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier


# Required columns from the Heart Disease dataset
FEATURE_COLUMNS = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]
TARGET_COLUMN = "target"
REQUIRED_COLUMNS = FEATURE_COLUMNS + [TARGET_COLUMN]


# Domain ranges used for simple anomaly handling
CATEGORICAL_RANGES = {
    "sex": (0, 1),
    "cp": (0, 3),
    "fbs": (0, 1),
    "restecg": (0, 2),
    "exang": (0, 1),
    "slope": (0, 2),
    "ca": (0, 4),
    "thal": (0, 3),
}
CONTINUOUS_COLUMNS = ["age", "trestbps", "chol", "thalach", "oldpeak"]


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_CANDIDATES = [
    os.path.join(BASE_DIR, "dataset", "heart_disease_processed.csv"),
    os.path.join(BASE_DIR, "dataset", "heart.csv"),
]
MODEL_PATH = os.path.join(BASE_DIR, "heart_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")


def find_dataset_path() -> str:
    """Return first existing dataset path from known candidates."""
    for path in DATASET_CANDIDATES:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        "Dataset not found. Expected one of: "
        + ", ".join(DATASET_CANDIDATES)
    )


def load_dataset(path: str) -> pd.DataFrame:
    """Load CSV and validate required columns."""
    print("\n[1] Loading dataset...")
    df = pd.read_csv(path)
    print(f"Dataset path: {path}")
    print(f"Shape: {df.shape}")

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    return df[REQUIRED_COLUMNS].copy()


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean data:
    - Convert all columns to numeric
    - Fill missing values
    - Handle outliers using IQR clipping on continuous features
    - Clip categorical values into expected ranges
    - Ensure binary target (0/1)
    """
    print("\n[2] Cleaning dataset...")
    cleaned = df.copy()

    # Convert all required columns to numeric, invalid parsing -> NaN
    for col in REQUIRED_COLUMNS:
        cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")

    print("Missing values before cleaning:")
    print(cleaned.isna().sum().to_string())

    # Fill missing values for features with median
    for col in FEATURE_COLUMNS:
        median_value = cleaned[col].median()
        cleaned[col] = cleaned[col].fillna(median_value)

    # Fill missing target and convert to binary
    cleaned[TARGET_COLUMN] = cleaned[TARGET_COLUMN].fillna(0)
    cleaned[TARGET_COLUMN] = (cleaned[TARGET_COLUMN] > 0).astype(int)

    # Clip outliers in continuous columns using IQR rule
    for col in CONTINUOUS_COLUMNS:
        q1 = cleaned[col].quantile(0.25)
        q3 = cleaned[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)

    # Clip and round categorical values to valid domains
    for col, (low, high) in CATEGORICAL_RANGES.items():
        cleaned[col] = cleaned[col].round().clip(lower=low, upper=high)

    # Make sure all feature columns remain numeric
    for col in FEATURE_COLUMNS:
        if not pd.api.types.is_numeric_dtype(cleaned[col]):
            raise TypeError(f"Feature column '{col}' is not numeric after cleaning.")

    print("Missing values after cleaning:")
    print(cleaned.isna().sum().to_string())
    return cleaned


def split_and_scale(
    df: pd.DataFrame,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, StandardScaler]:
    """Split into train/test and fit StandardScaler."""
    print("\n[3] Train/test split and scaling...")
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)

    print(f"Train size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")
    return X_train_raw, X_test_raw, X_train, X_test, y_train, y_test, scaler


def build_models() -> Dict[str, object]:
    """Define models for comparison."""
    return {
        "LogisticRegression": LogisticRegression(
            max_iter=4000,
            random_state=42,
            class_weight="balanced",
            C=1.0,
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=350,
            max_depth=10,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        ),
        "XGBClassifier": XGBClassifier(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        ),
    }


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute requested metrics."""
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
    }


def train_and_compare_models(
    models: Dict[str, object],
    X_train_raw: np.ndarray,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> Tuple[str, object, Dict[str, Dict[str, float]]]:
    """
    Train all models, compare by test accuracy, and run 5-fold CV.
    Returns best model name, fitted best model, and all results.
    """
    print("\n[4] Training and comparing models...")
    results: Dict[str, Dict[str, float]] = {}

    best_name = ""
    best_model = None
    best_accuracy = -1.0

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        metrics = evaluate_predictions(y_test, y_pred)

        # Cross-validation with a pipeline to avoid leakage during scaling
        cv_pipeline = Pipeline(
            [("scaler", StandardScaler()), ("model", clone(model))]
        )
        cv_scores = cross_val_score(
            cv_pipeline,
            X_train_raw,
            y_train,
            cv=5,
            scoring="accuracy",
            n_jobs=-1,
        )

        results[name] = {
            **metrics,
            "cv_mean": float(cv_scores.mean()),
            "cv_std": float(cv_scores.std()),
        }

        print(f"\n{name}:")
        print(f"Accuracy : {metrics['accuracy']:.4f}")
        print(f"Precision: {metrics['precision']:.4f}")
        print(f"Recall   : {metrics['recall']:.4f}")
        print(f"F1-score : {metrics['f1']:.4f}")
        print(f"CV(5)    : {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

        if metrics["accuracy"] > best_accuracy:
            best_accuracy = metrics["accuracy"]
            best_name = name
            best_model = model

    if best_model is None:
        raise RuntimeError("No model was trained successfully.")

    print("\nBest model by test accuracy:")
    print(f"{best_name} (accuracy={best_accuracy:.4f})")
    return best_name, best_model, results


def calibrate_model(
    best_model: object,
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> CalibratedClassifierCV:
    """Calibrate best model with sigmoid to avoid over-confident probabilities."""
    print("\n[5] Calibrating best model with CalibratedClassifierCV (sigmoid)...")
    calibrated = CalibratedClassifierCV(
        estimator=clone(best_model),
        method="sigmoid",
        cv=5,
    )
    calibrated.fit(X_train, y_train)
    return calibrated


def clip_probability(prob: float) -> float:
    """Avoid exact 0% or 100% (and cap very high values at 95%)."""
    return float(np.clip(prob, 0.01, 0.95))


def risk_level_from_probability(prob: float) -> str:
    """Map probability to Vietnamese risk levels."""
    if prob < 0.25:
        return "Nguy cơ thấp"
    if prob < 0.50:
        return "Nguy cơ trung bình"
    if prob < 0.75:
        return "Nguy cơ cao"
    return "Nguy cơ rất cao"


def evaluate_final_model(
    model: CalibratedClassifierCV,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> Dict[str, float]:
    """Evaluate calibrated model and print confusion matrix."""
    print("\n[6] Evaluating calibrated final model...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    y_prob_clipped = np.array([clip_probability(p) for p in y_prob])

    metrics = evaluate_predictions(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall   : {metrics['recall']:.4f}")
    print(f"F1-score : {metrics['f1']:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print(
        "Calibrated probability range after clipping: "
        f"[{y_prob_clipped.min():.4f}, {y_prob_clipped.max():.4f}]"
    )

    return metrics


def save_artifacts(model: CalibratedClassifierCV, scaler: StandardScaler) -> None:
    """Save calibrated model and scaler using joblib."""
    print("\n[7] Saving artifacts...")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Saved model : {MODEL_PATH}")
    print(f"Saved scaler: {SCALER_PATH}")


def load_artifacts() -> Tuple[CalibratedClassifierCV, StandardScaler]:
    """Load persisted model and scaler."""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(
            "Model/scaler file not found. Run training first: python train_model.py"
        )
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler


def sanitize_input_record(data: Dict[str, float]) -> pd.DataFrame:
    """Validate and sanitize one input record for prediction."""
    missing_keys = [k for k in FEATURE_COLUMNS if k not in data]
    if missing_keys:
        raise ValueError(f"Missing input fields: {missing_keys}")

    record = pd.DataFrame([data], columns=FEATURE_COLUMNS)
    for col in FEATURE_COLUMNS:
        record[col] = pd.to_numeric(record[col], errors="coerce")
        if record[col].isna().any():
            raise ValueError(f"Invalid numeric value in field '{col}'.")

    # Clip continuous values to medically plausible broad limits
    broad_limits = {
        "age": (1, 120),
        "trestbps": (50, 300),
        "chol": (50, 700),
        "thalach": (40, 250),
        "oldpeak": (-5, 10),
    }
    for col, (low, high) in broad_limits.items():
        record[col] = record[col].clip(lower=low, upper=high)

    for col, (low, high) in CATEGORICAL_RANGES.items():
        record[col] = record[col].round().clip(lower=low, upper=high)

    return record


def predict_heart_risk(data: Dict[str, float]) -> Dict[str, float | str]:
    """
    Predict heart disease risk from one input dictionary.

    Input dictionary keys:
    {
        age, sex, cp, trestbps, chol, fbs, restecg,
        thalach, exang, oldpeak, slope, ca, thal
    }

    Returns:
    {
        "risk_probability": float,
        "risk_level": str
    }
    """
    model, scaler = load_artifacts()
    record = sanitize_input_record(data)

    x = scaler.transform(record[FEATURE_COLUMNS].values)
    raw_prob = float(model.predict_proba(x)[0, 1])
    prob = clip_probability(raw_prob)

    return {
        "risk_probability": prob,
        "risk_level": risk_level_from_probability(prob),
    }


def run_synthetic_tests() -> None:
    """Run 5 synthetic scenarios and print calibrated risk probabilities."""
    print("\n[8] Running 5 synthetic test cases...")
    test_cases = [
        (
            "Người khỏe mạnh",
            {
                "age": 30,
                "sex": 0,
                "cp": 2,
                "trestbps": 110,
                "chol": 180,
                "fbs": 0,
                "restecg": 0,
                "thalach": 175,
                "exang": 0,
                "oldpeak": 0.1,
                "slope": 1,
                "ca": 0,
                "thal": 1,
            },
        ),
        (
            "Nguy cơ thấp",
            {
                "age": 45,
                "sex": 0,
                "cp": 1,
                "trestbps": 122,
                "chol": 210,
                "fbs": 0,
                "restecg": 0,
                "thalach": 160,
                "exang": 0,
                "oldpeak": 0.6,
                "slope": 1,
                "ca": 0,
                "thal": 1,
            },
        ),
        (
            "Nguy cơ trung bình",
            {
                "age": 54,
                "sex": 1,
                "cp": 1,
                "trestbps": 135,
                "chol": 245,
                "fbs": 0,
                "restecg": 1,
                "thalach": 145,
                "exang": 0,
                "oldpeak": 1.4,
                "slope": 1,
                "ca": 1,
                "thal": 2,
            },
        ),
        (
            "Nguy cơ cao",
            {
                "age": 61,
                "sex": 1,
                "cp": 0,
                "trestbps": 150,
                "chol": 280,
                "fbs": 1,
                "restecg": 1,
                "thalach": 128,
                "exang": 1,
                "oldpeak": 2.4,
                "slope": 2,
                "ca": 2,
                "thal": 3,
            },
        ),
        (
            "Nguy cơ rất cao",
            {
                "age": 69,
                "sex": 1,
                "cp": 0,
                "trestbps": 168,
                "chol": 330,
                "fbs": 1,
                "restecg": 2,
                "thalach": 108,
                "exang": 1,
                "oldpeak": 3.6,
                "slope": 2,
                "ca": 3,
                "thal": 3,
            },
        ),
    ]

    for label, payload in test_cases:
        pred = predict_heart_risk(payload)
        prob_pct = pred["risk_probability"] * 100
        level = pred["risk_level"]
        print(f"- {label:18s} -> {prob_pct:6.2f}% | {level}")


def main() -> None:
    """Main training flow."""
    dataset_path = find_dataset_path()
    raw_df = load_dataset(dataset_path)
    clean_df = clean_dataset(raw_df)

    X_train_raw, X_test_raw, X_train, X_test, y_train, y_test, scaler = split_and_scale(
        clean_df
    )

    models = build_models()
    best_name, best_model, comparison = train_and_compare_models(
        models,
        X_train_raw,
        X_train,
        y_train,
        X_test,
        y_test,
    )

    calibrated_model = calibrate_model(best_model, X_train, y_train)
    final_metrics = evaluate_final_model(calibrated_model, X_test, y_test)
    save_artifacts(calibrated_model, scaler)
    run_synthetic_tests()

    print("\n[9] Summary")
    print(f"Selected best base model : {best_name}")
    print(f"Final calibrated accuracy: {final_metrics['accuracy']:.4f}")
    print("Model is ready for Flask/API integration via predict_heart_risk(data).")

    # Optional guidance if target accuracy band is not met
    acc_pct = final_metrics["accuracy"] * 100
    if 88 <= acc_pct <= 92:
        print("Accuracy is inside target band (88-92%).")
    else:
        print("Accuracy is outside target band (88-92%).")
        print("You can tune hyperparameters or rebalance classes to move toward the band.")


if __name__ == "__main__":
    main()
