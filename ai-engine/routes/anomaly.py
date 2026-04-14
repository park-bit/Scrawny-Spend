"""
routes/anomaly.py

POST /anomaly

Detects unusual expenses in a user's recent transaction history using
Isolation Forest.  Each flagged expense gets a human-readable explanation.

Request body (JSON):
  {
    "expenses": [
        {
            "id":       "abc123",
            "amount":   45000.0,
            "category": "food",
            "date":     "2025-03-15T00:00:00.000Z",
            "description": "Birthday dinner"
        },
        ...
    ]
  }

Response (JSON):
  {
    "success": true,
    "anomalies": [
        {
            "id":           "abc123",
            "amount":       45000.0,
            "category":     "food",
            "date":         "2025-03-15",
            "description":  "Birthday dinner",
            "anomalyScore": -0.32,
            "reason":       "₹45,000 on food is 5.6× your average food spend"
        }
    ],
    "totalScanned": 150,
    "totalFlagged": 1
  }
"""

import logging
from pathlib import Path
from typing import List, Dict, Any

import joblib
import numpy as np
import pandas as pd
from flask import Blueprint, request, jsonify, current_app

from utils.preprocessor import (
    CATEGORIES, build_expense_feature_matrix, validate_expense_list
)

logger = logging.getLogger(__name__)

anomaly_bp = Blueprint('anomaly', __name__)

MODEL_PATH = Path(__file__).parent.parent / "models" / "anomaly" / "model.pkl"

# Anomaly score threshold: IsolationForest.decision_function returns
# negative values for anomalies.  Values below this threshold are flagged.
# -0.05 is intentionally conservative to minimise false positives.
SCORE_THRESHOLD = -0.05


def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Anomaly model not found. Run: python models/anomaly/train_isolation.py"
        )
    return joblib.load(MODEL_PATH)


def get_anomaly_detector():
    if not hasattr(current_app, '_anomaly_detector'):
        logger.info("Loading Isolation Forest model into app context…")
        current_app._anomaly_detector = _load_model()
    return current_app._anomaly_detector


def _compute_category_averages(expenses: List[Dict]) -> Dict[str, float]:
    """
    Compute the mean spend per category from the provided expenses.
    Used to generate human-readable anomaly explanations.

    Returns: { "food": 3200.0, "transport": 800.0, ... }
    Time: O(n)
    """
    totals  = {cat: 0.0 for cat in CATEGORIES}
    counts  = {cat: 0   for cat in CATEGORIES}

    for exp in expenses:
        cat    = exp.get('category', 'other').lower()
        amount = float(exp.get('amount', 0))
        if cat in totals:
            totals[cat] += amount
            counts[cat] += 1

    return {
        cat: round(totals[cat] / counts[cat], 2)
        for cat in CATEGORIES
        if counts[cat] > 0
    }


def _generate_reason(expense: Dict, score: float, cat_averages: Dict[str, float]) -> str:
    """
    Generate a human-readable explanation for a flagged anomaly.

    Strategy:
      1. Compare the expense amount to the user's category average.
      2. If no category average exists, compare to overall median.
      3. Annotate weekend + large-amount patterns.

    This explanation is stored in the Anomaly collection in MongoDB
    and surfaced in the AI Insights panel in the React frontend.
    """
    amount   = float(expense.get('amount', 0))
    category = expense.get('category', 'other').lower()
    avg      = cat_averages.get(category)

    if avg and avg > 0:
        multiplier = round(amount / avg, 1)
        if multiplier >= 2:
            return (
                f"₹{amount:,.0f} on {category} is {multiplier}× your average "
                f"{category} spend of ₹{avg:,.0f}."
            )

    # Fallback: describe severity based on score alone
    severity = "significantly" if score < -0.2 else "slightly"
    return (
        f"₹{amount:,.0f} on {category} is {severity} unusual compared to "
        f"your typical spending patterns."
    )


@anomaly_bp.route('/anomaly', methods=['POST'])
def detect_anomaly():
    """
    Detect anomalies in a list of expenses.

    Steps:
      1. Validate input and build the feature matrix.
      2. Run IsolationForest.decision_function (returns raw anomaly scores).
      3. Flag expenses where score < SCORE_THRESHOLD.
      4. Generate a reason string for each flagged expense.
      5. Return flagged expenses with scores and reasons.

    IsolationForest.decision_function vs .predict:
      We use decision_function rather than predict so we get continuous
      scores, not just binary labels.  This lets the Node.js service rank
      anomalies by severity and the frontend can display a gradient.

    Statistical fallback:
      If the model file is not found (first run before training),
      we fall back to a simple Z-score method so the endpoint always
      returns something useful.
    """
    data = request.get_json(silent=True) or {}

    # ── Input validation ──────────────────────────────────
    try:
        expenses = validate_expense_list(data.get('expenses', []), min_count=1)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    if len(expenses) > 10_000:
        return jsonify({"success": False, "error": "Maximum 10,000 expenses per request."}), 400

    # ── Feature extraction ────────────────────────────────
    try:
        feature_df = build_expense_feature_matrix(expenses)
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

    # ── Category averages for explanation generation ──────
    cat_averages = _compute_category_averages(expenses)

    # ── Isolation Forest scoring ──────────────────────────
    try:
        detector = get_anomaly_detector()
        # decision_function: more negative = more anomalous
        scores   = detector.decision_function(feature_df)

    except FileNotFoundError:
        logger.warning("Anomaly model not found; falling back to Z-score method.")
        return _zscore_fallback(expenses, cat_averages)

    except Exception as e:
        logger.exception(f"Anomaly detection failed: {e}")
        return jsonify({"success": False, "error": "Anomaly detection failed."}), 500

    # ── Collect flagged anomalies ─────────────────────────
    anomalies = []
    for i, (exp, score) in enumerate(zip(expenses, scores)):
        if score < SCORE_THRESHOLD:
            anomalies.append({
                "id":           exp.get('_id') or exp.get('id') or str(i),
                "amount":       float(exp.get('amount', 0)),
                "category":     exp.get('category', 'other'),
                "date":         str(exp.get('date', ''))[:10],
                "description":  exp.get('description', ''),
                "anomalyScore": round(float(score), 4),
                "reason":       _generate_reason(exp, float(score), cat_averages),
            })

    # Sort: most anomalous (lowest score) first
    anomalies.sort(key=lambda a: a['anomalyScore'])

    logger.info(
        f"Anomaly scan complete: {len(anomalies)}/{len(expenses)} flagged "
        f"(threshold={SCORE_THRESHOLD})"
    )

    return jsonify({
        "success":      True,
        "anomalies":    anomalies,
        "totalScanned": len(expenses),
        "totalFlagged": len(anomalies),
    })


def _zscore_fallback(expenses: List[Dict], cat_averages: Dict[str, float]):
    """
    Fallback anomaly detection using per-category Z-scores.

    An expense is flagged if its amount is more than 2 standard deviations
    above the category mean (Z > 2.0, ~97.7th percentile).

    This is a well-understood statistical method that requires no trained model.
    It's less sophisticated than Isolation Forest (can't capture multivariate
    patterns) but always works and is easy to explain.

    Time: O(n)  Space: O(c) where c = categories
    """
    from collections import defaultdict

    cat_amounts = defaultdict(list)
    for exp in expenses:
        cat    = exp.get('category', 'other').lower()
        amount = float(exp.get('amount', 0))
        cat_amounts[cat].append(amount)

    # Compute per-category mean and std
    cat_stats = {}
    for cat, amounts in cat_amounts.items():
        arr = np.array(amounts)
        cat_stats[cat] = {
            'mean': float(arr.mean()),
            'std':  float(arr.std()) if arr.std() > 0 else 1.0,
        }

    anomalies = []
    for i, exp in enumerate(expenses):
        cat    = exp.get('category', 'other').lower()
        amount = float(exp.get('amount', 0))
        stats  = cat_stats.get(cat, {'mean': amount, 'std': 1.0})
        z      = (amount - stats['mean']) / stats['std']

        if z > 2.0:
            pseudo_score = round(-z / 10, 4)  # Normalise to negative score range
            anomalies.append({
                "id":           exp.get('_id') or exp.get('id') or str(i),
                "amount":       amount,
                "category":     cat,
                "date":         str(exp.get('date', ''))[:10],
                "description":  exp.get('description', ''),
                "anomalyScore": pseudo_score,
                "reason":       _generate_reason(exp, pseudo_score, cat_averages),
                "method":       "zscore_fallback",
            })

    anomalies.sort(key=lambda a: a['anomalyScore'])

    return jsonify({
        "success":      True,
        "anomalies":    anomalies,
        "totalScanned": len(expenses),
        "totalFlagged": len(anomalies),
        "note":         "Using Z-score fallback – run train_isolation.py for full model.",
    })
