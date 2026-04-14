"""
app.py

Flask application factory for the Smart Expense Tracker AI Engine.

Architecture:
  - Single-process Flask app served by Gunicorn (2 workers on Render free tier).
  - ML models are loaded once per process at startup into the Flask app context,
    avoiding redundant disk reads on every request.
  - All three route blueprints are registered under the root path:
      POST /classify
      POST /predict
      POST /anomaly
  - An X-Internal-Secret header guard rejects requests not coming from
    the Node.js backend, ensuring the Python service is not publicly callable.

Deployment (Render free tier):
  Start command: gunicorn app:create_app() --workers 2 --bind 0.0.0.0:8000
  Or use the Procfile.

Environment variables:
  AI_ENGINE_SECRET  – shared secret with the Node.js backend (required in prod)
  FLASK_ENV         – 'development' or 'production' (default: production)
  PORT              – port to bind (default: 8000)
"""

import os
import logging
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv()

# ── Logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────
AI_ENGINE_SECRET = os.getenv('AI_ENGINE_SECRET', '')
FLASK_ENV        = os.getenv('FLASK_ENV', 'production')
IS_PROD          = FLASK_ENV == 'production'

# Model paths – used for preload checks at startup
MODEL_PATHS = {
    'classifier': Path('models/classifier/model.pkl'),
    'predictor':  Path('models/predictor/model.pkl'),
    'anomaly':    Path('models/anomaly/model.pkl'),
}


# ─────────────────────────────────────────────────────────
# Security middleware
# ─────────────────────────────────────────────────────────

def require_internal_secret(app: Flask):
    """
    Register a before_request hook that validates X-Internal-Secret.

    In production, ALL requests must carry the correct secret header.
    This prevents the AI service from being called directly by browsers
    or third parties – only the Node.js API backend may call it.

    In development, the check is skipped when AI_ENGINE_SECRET is not set
    so you can test endpoints with curl/Postman without configuration.
    """
    @app.before_request
    def _check_secret():
        # Skip health check
        if request.path == '/health':
            return None

        # Skip auth entirely in dev when no secret is configured
        if not IS_PROD and not AI_ENGINE_SECRET:
            return None

        incoming_secret = request.headers.get('X-Internal-Secret', '')
        if incoming_secret != AI_ENGINE_SECRET:
            logger.warning(
                f"Unauthorized request to {request.path} "
                f"from {request.remote_addr}"
            )
            return jsonify({"success": False, "error": "Unauthorized"}), 401

        return None


# ─────────────────────────────────────────────────────────
# Model preloading
# ─────────────────────────────────────────────────────────

def preload_models(app: Flask):
    """
    Load all ML models into the Flask app context at startup.

    Benefits:
      - Eliminates per-request disk I/O (joblib.load can take 100-500 ms).
      - Makes the first real request fast (no cold-start penalty per request).
      - Surfaces missing model files immediately at startup, not mid-request.

    Models are stored as attributes on the `app` object.
    Route handlers access them via `current_app._classifier` etc.
    """
    with app.app_context():
        import joblib

        for name, path in MODEL_PATHS.items():
            if not path.exists():
                logger.warning(
                    f"[Startup] {name} model not found at {path}. "
                    f"Run the corresponding training script before serving requests."
                )
                continue

            try:
                attr = f'_{name}'
                if name == 'predictor':
                    # ANN predictor needs both joblib meta and Keras model
                    import tensorflow as tf
                    keras_path = Path('models/predictor/keras_model.keras')
                    if keras_path.exists():
                        meta  = joblib.load(path)
                        model = tf.keras.models.load_model(str(keras_path))
                        setattr(app, attr, (meta, model))
                        logger.info(f"[Startup] Loaded ANN predictor ✓")
                    else:
                        logger.warning(f"[Startup] Keras model dir missing at {keras_path}")
                else:
                    setattr(app, attr, joblib.load(path))
                    logger.info(f"[Startup] Loaded {name} model ✓")

            except Exception as e:
                logger.error(f"[Startup] Failed to load {name} model: {e}")


# ─────────────────────────────────────────────────────────
# Application factory
# ─────────────────────────────────────────────────────────

def create_app() -> Flask:
    """
    Flask application factory.

    Using a factory function (instead of a module-level app instance)
    makes the app testable: each test can call create_app() with
    different configs without state leaking between tests.
    """
    app = Flask(__name__)

    # ── Configuration ─────────────────────────────────────
    app.config['ENV']     = FLASK_ENV
    app.config['DEBUG']   = not IS_PROD
    app.config['TESTING'] = False

    # ── Security ──────────────────────────────────────────
    require_internal_secret(app)

    # ── Blueprints ────────────────────────────────────────
    from routes.classify import classify_bp
    from routes.predict  import predict_bp
    from routes.anomaly  import anomaly_bp

    app.register_blueprint(classify_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(anomaly_bp)

    # ── Health check ──────────────────────────────────────
    @app.get('/health')
    def health():
        model_status = {
            name: path.exists()
            for name, path in MODEL_PATHS.items()
        }
        return jsonify({
            "status":  "ok",
            "env":     FLASK_ENV,
            "models":  model_status,
        })

    # ── Global error handlers ─────────────────────────────
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"success": False, "error": f"Route not found: {request.path}"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"success": False, "error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        logger.exception(f"Unhandled exception: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

    # ── Preload models ────────────────────────────────────
    preload_models(app)

    logger.info(f"AI Engine ready  |  env={FLASK_ENV}  |  secret={'set' if AI_ENGINE_SECRET else 'unset (dev mode)'}")

    return app


# ─────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app  = create_app()
    # Use Gunicorn in production (see Procfile); Flask dev server for local only
    app.run(host='0.0.0.0', port=port, debug=not IS_PROD)
