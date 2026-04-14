"""
routes/classify.py

POST /classify

Classifies an expense description using the trained TF-IDF + Voting ensemble.

Response shape (unchanged — backward compatible):
  { success, category, confidence, topK }

The model can now return income category labels (salary, freelance, business,
investment, gift, other_income) in addition to the 9 expense categories.
The Node.js caller maps these appropriately.
"""

import logging
from pathlib import Path

import joblib
import numpy as np
from flask import Blueprint, request, jsonify, current_app

from utils.preprocessor import clean_text

logger = logging.getLogger(__name__)

classify_bp = Blueprint('classify', __name__)

MODEL_PATH = Path(__file__).parent.parent / "models" / "classifier" / "model.pkl"
TOP_K      = 3


def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Classifier model not found at {MODEL_PATH}. "
            "Run: python models/classifier/train_classifier.py"
        )
    return joblib.load(MODEL_PATH)


def get_classifier():
    if not hasattr(current_app, '_classifier'):
        logger.info("Loading classifier model...")
        current_app._classifier = _load_model()
    return current_app._classifier


@classify_bp.route('/classify', methods=['POST'])
def classify():
    data = request.get_json(silent=True) or {}

    description = data.get('description', '')
    if not description or not isinstance(description, str):
        return jsonify({"success": False, "error": "'description' is required"}), 400

    description = description.strip()
    if len(description) > 500:
        return jsonify({"success": False, "error": "'description' must be 500 chars or fewer"}), 400

    cleaned = clean_text(description)

    # Graceful fallback for descriptions that clean to empty
    if not cleaned:
        return jsonify({
            "success":    True,
            "category":   "other",
            "confidence": round(1 / 9, 4),
            "topK":       [{"category": "other", "confidence": round(1 / 9, 4)}],
            "note":       "Description too generic; defaulting to 'other'.",
        })

    try:
        clf   = get_classifier()
        proba = clf.predict_proba([cleaned])[0]

        try:
            classes = clf.named_steps['ensemble'].classes_
        except AttributeError:
            classes = clf.classes_

        sorted_idx     = np.argsort(proba)[::-1]
        top_category   = classes[sorted_idx[0]]
        top_confidence = round(float(proba[sorted_idx[0]]), 4)

        top_k = [
            {"category": classes[i], "confidence": round(float(proba[i]), 4)}
            for i in sorted_idx[:TOP_K]
        ]

        logger.info(f"classify: '{description[:50]}' → {top_category} ({top_confidence:.0%})")

        return jsonify({
            "success":    True,
            "category":   top_category,
            "confidence": top_confidence,
            "topK":       top_k,
        })

    except FileNotFoundError as e:
        logger.error(f"Classifier model missing: {e}")
        return jsonify({
            "success":    True,
            "category":   "other",
            "confidence": 0.5,
            "topK":       [{"category": "other", "confidence": 0.5}],
            "note":       "Classifier not yet trained. Add more expenses to enable AI categorisation.",
        })

    except Exception as e:
        # Handle sklearn's NotFittedError gracefully — model file exists but hasn't been fitted yet
        if 'not fitted' in str(e).lower() or 'notfitted' in type(e).__name__.lower():
            logger.warning(f"Classifier not fitted yet, returning default: {e}")
            return jsonify({
                "success":    True,
                "category":   "other",
                "confidence": 0.5,
                "topK":       [{"category": "other", "confidence": 0.5}],
                "note":       "AI model warming up. Category will improve as you add more expenses.",
            })
        logger.exception(f"Classification failed: {e}")
        return jsonify({"success": False, "error": "Classification failed. Please try again."}), 500
