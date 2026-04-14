"""
models/anomaly/train_isolation.py

Trains the anomaly detection model using Isolation Forest.

ALGORITHM CHOICE: Isolation Forest

WHY ISOLATION FOREST over statistical methods (Z-score, IQR):
  - Z-score and IQR assume a Gaussian distribution of spending.
    Real expense data is right-skewed and multi-modal (spikes on
    salary day, near-zero on weekdays, large one-offs for travel).
  - Isolation Forest makes NO distributional assumption.
    It isolates anomalies by randomly partitioning the feature space:
    anomalies are easier to isolate (require fewer splits) and therefore
    get shorter average path lengths in the random trees.
  - Works well with multi-dimensional features (amount + category + time),
    which simple threshold rules cannot handle.

CONTAMINATION PARAMETER:
  Set to 0.05 (5%) – we expect roughly 1 in 20 expenses to be unusual.
  This is conservative; lower values = fewer false positives.
  Tunable per-user in a future personalisation layer.

FEATURE SPACE:
  [amount, day_of_week, day_of_month, month, is_weekend, cat_*]
  Category one-hot encoding lets the model learn that ₹5000 on 'food'
  is far more anomalous than ₹5000 on 'travel'.

HOW TO RUN:
  python models/anomaly/train_isolation.py

  Writes models/anomaly/model.pkl on success.
  Re-training with real user data is encouraged (see retrain() function).
"""

import sys
import logging
import joblib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from utils.preprocessor import CATEGORIES, extract_time_features

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

MODEL_DIR   = Path(__file__).parent
MODEL_PATH  = MODEL_DIR / "model.pkl"

CONTAMINATION = 0.05   # expected fraction of outliers


# ─────────────────────────────────────────────────────────
# Synthetic training data
# ─────────────────────────────────────────────────────────

def generate_normal_expenses(n: int = 300) -> pd.DataFrame:
    """
    Generate synthetic 'normal' expense records to train on.

    Distribution:
      - 70% small transactions (₹50–₹500): tea, auto, canteen
      - 25% medium transactions (₹500–₹5000): restaurant, shopping
      -  5% large legitimate transactions (₹5000–₹30000): rent, travel

    One-hot category is drawn proportionally to realistic usage.
    """
    np.random.seed(42)
    records = []

    cat_weights = [0.25, 0.15, 0.20, 0.08, 0.07, 0.10, 0.05, 0.05, 0.05]

    for _ in range(n):
        roll = np.random.rand()
        if roll < 0.70:
            amount = np.random.uniform(50, 500)
        elif roll < 0.95:
            amount = np.random.uniform(500, 5_000)
        else:
            amount = np.random.uniform(5_000, 30_000)

        # Random date in the past 12 months
        day_of_week  = np.random.randint(0, 7)
        day_of_month = np.random.randint(1, 29)
        month        = np.random.randint(1, 13)
        is_weekend   = int(day_of_week >= 5)

        category = np.random.choice(CATEGORIES, p=cat_weights)

        row = {
            "amount":      round(amount, 2),
            "day_of_week": day_of_week,
            "day_of_month": day_of_month,
            "month":       month,
            "is_weekend":  is_weekend,
        }
        for cat in CATEGORIES:
            row[f"cat_{cat}"] = int(category == cat)

        records.append(row)

    return pd.DataFrame(records)


# ─────────────────────────────────────────────────────────
# Model construction
# ─────────────────────────────────────────────────────────

def build_pipeline(contamination: float = CONTAMINATION) -> Pipeline:
    """
    Pipeline: StandardScaler → IsolationForest

    StandardScaler is essential: IsolationForest uses random feature splits
    and is sensitive to scale differences.  Without scaling, 'amount' (range
    ₹50–₹50,000) would dominate the one-hot category flags (0/1).

    IsolationForest hyperparameters:
      n_estimators=200    – more trees = more stable anomaly scores
      max_samples='auto'  – uses min(256, n_samples); fast on small datasets
      contamination=0.05  – threshold for the decision_function boundary
      random_state=42     – reproducible results
    """
    scaler = StandardScaler()

    iso_forest = IsolationForest(
        n_estimators=200,
        max_samples='auto',
        contamination=contamination,
        max_features=1.0,    # use all features for each tree
        bootstrap=False,
        random_state=42,
        n_jobs=-1,           # use all CPU cores
    )

    return Pipeline([
        ('scaler',     scaler),
        ('iso_forest', iso_forest),
    ])


# ─────────────────────────────────────────────────────────
# Training entry point
# ─────────────────────────────────────────────────────────

def train(contamination: float = CONTAMINATION):
    logger.info("Generating synthetic normal expense data…")
    df = generate_normal_expenses(n=300)
    logger.info(f"  Training samples: {len(df)}")
    logger.info(f"  Features: {list(df.columns)}")

    pipeline = build_pipeline(contamination=contamination)
    pipeline.fit(df)

    # Sanity check: score on training data
    # IsolationForest.decision_function returns negative scores for anomalies
    scores = pipeline.decision_function(df)
    n_flagged = (scores < 0).sum()
    logger.info(f"  Training anomalies flagged: {n_flagged}/{len(df)} "
                f"({n_flagged/len(df)*100:.1f}%, target≈{contamination*100:.0f}%)")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"Model saved → {MODEL_PATH}")
    logger.info(f"Model size: {MODEL_PATH.stat().st_size / 1024:.1f} KB")


def retrain(expense_dicts: list, contamination: float = CONTAMINATION):
    """
    Retrain the anomaly model on a user's real expense data.
    Called by the Node.js cron job via a POST /anomaly/retrain endpoint.

    This personalises the model: ₹20,000 on food is normal for some users,
    anomalous for others.  Per-user retraining captures this context.

    expense_dicts: list of expense objects from MongoDB
    """
    from utils.preprocessor import build_expense_feature_matrix

    df = build_expense_feature_matrix(expense_dicts)
    pipeline = build_pipeline(contamination=contamination)
    pipeline.fit(df)

    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"Anomaly model retrained on {len(df)} real expenses.")
    return pipeline


if __name__ == "__main__":
    train()
