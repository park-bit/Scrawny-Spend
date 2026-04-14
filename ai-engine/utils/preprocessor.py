"""
utils/preprocessor.py

Shared preprocessing utilities.

CATEGORIES now matches the Node.js Expense model exactly:
  - 9 expense categories
  - 6 income categories (for the Expense.type='income' field)

The feature-engineering functions (build_expense_feature_matrix,
aggregate_monthly) only use EXPENSE_CATEGORIES for one-hot encoding
so anomaly detection and ANN prediction are not affected by income entries.
"""

import re
import string
import logging
from typing import List, Dict, Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── Must mirror Node.js Expense model ────────────────────
EXPENSE_CATEGORIES = [
    "food", "transport", "utilities", "entertainment",
    "health", "shopping", "education", "travel", "other",
]

INCOME_CATEGORIES = [
    "salary", "freelance", "business", "investment", "gift", "other_income",
]

# Legacy alias – code that imports CATEGORIES still works
CATEGORIES = EXPENSE_CATEGORIES

_STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "is", "was", "are", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "i", "my",
    "me", "we", "our", "you", "your", "he", "she", "it", "they",
    "their", "this", "that", "these", "those",
})


def clean_text(text: str) -> str:
    """Normalise raw expense description for TF-IDF. O(n)."""
    if not text or not isinstance(text, str):
        return ""
    text  = text.lower()
    text  = re.sub(r'\b\d+\b', '', text)
    text  = text.translate(str.maketrans('', '', string.punctuation))
    text  = re.sub(r'\s+', ' ', text).strip()
    tokens = [t for t in text.split() if t not in _STOPWORDS and len(t) > 1]
    return ' '.join(tokens)


def clean_texts(texts: List[str]) -> List[str]:
    return [clean_text(t) for t in texts]


def extract_time_features(date_str: str) -> Dict[str, int]:
    try:
        ts = pd.Timestamp(date_str)
        return {
            "day_of_week":  ts.dayofweek,
            "day_of_month": ts.day,
            "month":        ts.month,
            "is_weekend":   int(ts.dayofweek >= 5),
        }
    except Exception:
        return {"day_of_week": 0, "day_of_month": 1, "month": 1, "is_weekend": 0}


def build_expense_feature_matrix(expenses: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Convert expense dicts → feature DataFrame for anomaly detection.
    Only processes type='expense' records (or records with no type field).
    Income records are silently skipped.
    """
    if not expenses:
        raise ValueError("expenses list is empty")

    rows = []
    for exp in expenses:
        # Skip income records from anomaly scoring
        if exp.get('type') == 'income':
            continue

        time_feats = extract_time_features(exp.get("date", ""))
        row = {"amount": float(exp.get("amount", 0)), **time_feats}

        category = exp.get("category", "other").lower()
        # Map income categories to 'other' if they somehow slip through
        if category not in EXPENSE_CATEGORIES:
            category = "other"

        for cat in EXPENSE_CATEGORIES:
            row[f"cat_{cat}"] = int(category == cat)

        rows.append(row)

    if not rows:
        raise ValueError("No expense records found after filtering")

    df = pd.DataFrame(rows)
    df = df.fillna(0).replace([np.inf, -np.inf], 0)
    return df


def aggregate_monthly(expenses: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Aggregate expense dicts → monthly summary DataFrame for ANN predictor.
    Only processes type='expense' records.
    """
    if not expenses:
        raise ValueError("expenses list is empty")

    records = []
    for exp in expenses:
        if exp.get('type') == 'income':
            continue
        try:
            ts = pd.Timestamp(exp.get("date", ""))
            category = exp.get("category", "other").lower()
            if category not in EXPENSE_CATEGORIES:
                category = "other"
            records.append({
                "year":     ts.year,
                "month":    ts.month,
                "amount":   float(exp.get("amount", 0)),
                "category": category,
            })
        except Exception:
            continue

    if not records:
        raise ValueError("No valid expense records after parsing")

    df    = pd.DataFrame(records)
    pivot = df.pivot_table(
        index=["year", "month"], columns="category",
        values="amount", aggfunc="sum", fill_value=0,
    ).reset_index()

    for cat in EXPENSE_CATEGORIES:
        if cat not in pivot.columns:
            pivot[cat] = 0.0

    rename_map = {cat: f"cat_{cat}" for cat in EXPENSE_CATEGORIES if cat in pivot.columns}
    pivot = pivot.rename(columns=rename_map)

    cat_cols = [f"cat_{cat}" for cat in EXPENSE_CATEGORIES if f"cat_{cat}" in pivot.columns]
    pivot["total_amount"] = pivot[cat_cols].sum(axis=1)

    return pivot.sort_values(["year", "month"]).reset_index(drop=True)


def validate_expense_list(expenses: Any, min_count: int = 1) -> List[Dict]:
    if not isinstance(expenses, list):
        raise ValueError("'expenses' must be a JSON array")
    if len(expenses) < min_count:
        raise ValueError(f"At least {min_count} expense(s) required")
    return expenses
