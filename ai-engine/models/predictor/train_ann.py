"""
models/predictor/train_ann.py

Trains a lightweight ANN to predict next-month total spending
and per-category breakdown from the last N months of data.
"""

import sys
import logging
import joblib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from utils.preprocessor import CATEGORIES

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

MODEL_DIR   = Path(__file__).parent
MODEL_PATH  = MODEL_DIR / "model.pkl"
KERAS_PATH  = MODEL_DIR / "keras_model.keras"   # ✅ fixed extension

LOOKBACK    = 3
EPOCHS      = 200
BATCH_SIZE  = 8


def generate_synthetic_data(n_months: int = 36) -> pd.DataFrame:
    np.random.seed(42)
    rows = []

    base = {
        "food": 8000,
        "transport": 3000,
        "utilities": 5000,
        "entertainment": 2000,
        "health": 1500,
        "shopping": 4000,
        "education": 2500,
        "travel": 1000,
        "other": 2000,
    }

    for i in range(n_months):
        month = (i % 12) + 1
        year = 2023 + (i // 12)

        seasonal = 1.3 if month in (12, 1) else (0.9 if month in (6, 7) else 1.0)

        row = {"year": year, "month": month}
        total = 0

        for cat, base_spend in base.items():
            noise = np.random.normal(1.0, 0.15)
            spend = max(0, base_spend * seasonal * noise)
            row[f"cat_{cat}"] = round(spend, 2)
            total += spend

        row["total_amount"] = round(total, 2)
        rows.append(row)

    return pd.DataFrame(rows)


def add_cyclical_month(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df


def make_sequences(df, lookback, feature_cols, target_cols):
    X, y = [], []

    for i in range(lookback, len(df)):
        window = df.iloc[i - lookback:i][feature_cols].values.flatten()
        target = df.iloc[i][target_cols].values
        X.append(window)
        y.append(target)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def build_model(input_dim: int, output_dim: int):
    from tensorflow import keras

    model = keras.Sequential([
        keras.layers.Input(shape=(input_dim,)),
        keras.layers.Dense(64, activation="relu"),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(32, activation="relu"),
        keras.layers.Dropout(0.1),
        keras.layers.Dense(output_dim, activation="linear"),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="mean_squared_error",
        metrics=["mae"],
    )

    return model


def train():
    from tensorflow import keras

    logger.info("Generating synthetic training data...")
    df = generate_synthetic_data(36)
    df = add_cyclical_month(df)

    cat_cols = [f"cat_{c}" for c in CATEGORIES]
    feature_cols = cat_cols + ["total_amount", "month_sin", "month_cos"]
    target_cols = ["total_amount"] + cat_cols

    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()

    df_scaled = df.copy()
    df_scaled[feature_cols] = scaler_X.fit_transform(df[feature_cols])
    df_scaled[target_cols] = scaler_y.fit_transform(df[target_cols])

    X, y = make_sequences(df_scaled, LOOKBACK, feature_cols, target_cols)

    split = max(1, len(X) - 4)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = build_model(X.shape[1], y.shape[1])

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=20,
            restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=10,
            min_lr=1e-5
        ),
    ]

    logger.info("Training ANN...")
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=0,
    )

    final_epoch = len(history.history["loss"])
    final_val = history.history["val_loss"][-1]

    logger.info(f"Stopped at epoch {final_epoch} | val_loss: {final_val:.4f}")

    # ✅ Save model correctly for Keras 3
    model.save(str(KERAS_PATH))
    logger.info(f"Keras model saved → {KERAS_PATH}")

    meta = {
        "scaler_X": scaler_X,
        "scaler_y": scaler_y,
        "feature_cols": feature_cols,
        "target_cols": target_cols,
        "lookback": LOOKBACK,
        "categories": CATEGORIES,
    }

    joblib.dump(meta, MODEL_PATH)
    logger.info(f"Meta saved → {MODEL_PATH}")


if __name__ == "__main__":
    train()