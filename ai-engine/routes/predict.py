"""
routes/predict.py

POST /predict

Predicts next month's total spending and per-category breakdown
using the trained ANN (Keras) model.

Request body (JSON):
  {
    "expenses": [
        {
            "amount":   450.0,
            "category": "food",
            "date":     "2025-03-15T00:00:00.000Z"
        },
        ...
    ]
  }
  Minimum: 1 expense.  Model is most accurate with 3+ months of history.

Response (JSON):
  {
    "success": true,
    "prediction": {
        "targetMonth":   "2025-05",
        "predictedTotal": 28450.50,
        "byCategory": {
            "food":          8200.00,
            "transport":     3100.00,
            "utilities":     5000.00,
            "entertainment": 2200.00,
            "health":        1500.00,
            "shopping":      4250.00,
            "education":     2500.00,
            "travel":        900.00,
            "other":         800.50
        },
        "confidence":    "medium",
        "dataMonths":    3
    }
  }

Confidence tiers:
  "low"    – < 2 months of data (model is extrapolating from minimal data)
  "medium" – 2-5 months
  "high"   – 6+ months (model has seen meaningful seasonal variation)
"""

import logging
from pathlib import Path
from datetime import datetime
from dateutil.relativedelta import relativedelta

import joblib
import numpy as np
import pandas as pd
from flask import Blueprint, request, jsonify, current_app

from utils.preprocessor import (
    CATEGORIES, aggregate_monthly, validate_expense_list
)

logger = logging.getLogger(__name__)

predict_bp = Blueprint('predict', __name__)

MODEL_DIR  = Path(__file__).parent.parent / "models" / "predictor"
META_PATH  = MODEL_DIR / "model.pkl"
KERAS_PATH = MODEL_DIR / "keras_model"


def _load_model():
    """Load ANN meta (scalers, config) and Keras model from disk."""
    if not META_PATH.exists() or not KERAS_PATH.exists():
        raise FileNotFoundError(
            f"ANN model not found. Run: python models/predictor/train_ann.py"
        )
    import tensorflow as tf
    meta  = joblib.load(META_PATH)
    model = tf.keras.models.load_model(str(KERAS_PATH))
    return meta, model


def get_predictor():
    """Fetch the ANN model pair from Flask app context cache."""
    if not hasattr(current_app, '_predictor'):
        logger.info("Loading ANN predictor into app context…")
        current_app._predictor = _load_model()
    return current_app._predictor


def _confidence_tier(n_months: int) -> str:
    """Map number of data months to a confidence label."""
    if n_months < 2:
        return "low"
    if n_months < 6:
        return "medium"
    return "high"


def _next_month_label(monthly_df: pd.DataFrame) -> str:
    """
    Determine the next calendar month after the latest month in the data.
    Returns a "YYYY-MM" string.
    """
    latest_year  = int(monthly_df["year"].iloc[-1])
    latest_month = int(monthly_df["month"].iloc[-1])
    next_dt      = datetime(latest_year, latest_month, 1) + relativedelta(months=1)
    return next_dt.strftime("%Y-%m")


@predict_bp.route('/predict', methods=['POST'])
def predict():
    """
    Predict next month's spending from recent expense history.

    Steps:
      1. Validate and parse expenses from request body.
      2. Aggregate expenses into monthly feature rows.
      3. If insufficient history, fall back to statistical average prediction.
      4. Scale features, build lookback window, run ANN inference.
      5. Inverse-scale predictions and return.

    Fallback strategy:
      When the user has < LOOKBACK months of data, the ANN cannot form a
      complete window.  In this case we return a weighted average of the
      available months as the prediction.  This is honest (we note low
      confidence) and better than returning nothing.
    """
    data = request.get_json(silent=True) or {}

    # ── Input validation ──────────────────────────────────
    try:
        expenses = validate_expense_list(data.get('expenses', []), min_count=1)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    try:
        monthly_df = aggregate_monthly(expenses)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    n_months     = len(monthly_df)
    target_month = _next_month_label(monthly_df)
    confidence   = _confidence_tier(n_months)

    # ── Attempt ANN inference ─────────────────────────────
    try:
        meta, keras_model = get_predictor()
    except FileNotFoundError:
        # Model not trained yet → fall back immediately
        logger.warning("ANN model not found; falling back to average prediction.")
        return _average_fallback(monthly_df, target_month, confidence)
    except Exception as e:
        logger.exception(f"Failed to load ANN model: {e}")
        return _average_fallback(monthly_df, target_month, confidence)

    lookback      = meta['lookback']
    feature_cols  = meta['feature_cols']
    target_cols   = meta['target_cols']
    scaler_X      = meta['scaler_X']
    scaler_y      = meta['scaler_y']

    # ── Add cyclical month encoding ───────────────────────
    monthly_df['month_sin'] = np.sin(2 * np.pi * monthly_df['month'] / 12)
    monthly_df['month_cos'] = np.cos(2 * np.pi * monthly_df['month'] / 12)

    # Ensure all feature columns exist (fill missing categories with 0)
    for col in feature_cols:
        if col not in monthly_df.columns:
            monthly_df[col] = 0.0

    # ── Insufficient history → statistical fallback ───────
    if n_months < lookback:
        logger.info(f"Only {n_months} month(s) of data; using average fallback.")
        return _average_fallback(monthly_df, target_month, confidence)

    # ── Scale and build window ────────────────────────────
    try:
        feature_matrix = monthly_df[feature_cols].values
        scaled_X       = scaler_X.transform(feature_matrix)

        # Take the last `lookback` rows as the input window
        window = scaled_X[-lookback:].flatten().reshape(1, -1).astype(np.float32)

        # ANN inference (CPU; ~ 1-5 ms)
        raw_pred  = keras_model.predict(window, verbose=0)
        pred_vals = scaler_y.inverse_transform(raw_pred)[0]

        # Map output to target column names
        result = dict(zip(target_cols, pred_vals.tolist()))

        # Clamp negatives (rare; caused by scaler edge cases on tiny datasets)
        for key in result:
            result[key] = max(0.0, round(result[key], 2))

        total       = result.pop('total_amount', None)
        by_category = {
            col.replace('cat_', ''): result[col]
            for col in result
            if col.startswith('cat_')
        }

        # If ANN total drifts from category sum, reconcile to category sum
        computed_total = round(sum(by_category.values()), 2)
        predicted_total = total if total is not None else computed_total

        logger.info(
            f"ANN prediction for {target_month}: "
            f"total=₹{predicted_total:,.0f}  confidence={confidence}"
        )

        return jsonify({
            "success": True,
            "prediction": {
                "targetMonth":    target_month,
                "predictedTotal": predicted_total,
                "byCategory":     by_category,
                "confidence":     confidence,
                "dataMonths":     n_months,
                "method":         "ann",
            }
        })

    except Exception as e:
        logger.exception(f"ANN inference failed: {e}")
        return _average_fallback(monthly_df, target_month, confidence)


def _average_fallback(monthly_df: pd.DataFrame, target_month: str, confidence: str):
    """
    Fallback predictor: weighted average of available monthly totals.

    Uses exponentially decaying weights so more recent months contribute
    more to the prediction than older ones.
    Weight for month i (0 = oldest): decay^(n-i-1) where decay=0.8.

    This is a simple but honest baseline that beats "return nothing".
    It's surfaced to the client with confidence="low" and method="average".
    """
    cat_cols = [c for c in monthly_df.columns if c.startswith('cat_')]
    n        = len(monthly_df)
    decay    = 0.8

    # Exponential weights, most-recent month has weight 1.0
    weights = np.array([decay ** (n - i - 1) for i in range(n)])
    weights /= weights.sum()

    totals = monthly_df['total_amount'].values if 'total_amount' in monthly_df.columns else (
        monthly_df[cat_cols].sum(axis=1).values
    )
    predicted_total = round(float(np.dot(weights, totals)), 2)

    by_category = {}
    for col in cat_cols:
        cat_name = col.replace('cat_', '')
        cat_vals = monthly_df[col].values if col in monthly_df.columns else np.zeros(n)
        by_category[cat_name] = round(float(np.dot(weights, cat_vals)), 2)

    return jsonify({
        "success": True,
        "prediction": {
            "targetMonth":    target_month,
            "predictedTotal": predicted_total,
            "byCategory":     by_category,
            "confidence":     "low",
            "dataMonths":     n,
            "method":         "weighted_average",
            "note":           "Insufficient history for ANN; using weighted average.",
        }
    })
