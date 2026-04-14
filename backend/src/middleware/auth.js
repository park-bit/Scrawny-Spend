'use strict';

/**
 * src/middleware/auth.js
 *
 * JWT authentication middleware.
 *
 * Attach this to any route that requires a logged-in user:
 *   router.get('/expenses', protect, expenseController.getAll);
 *
 * On success:  req.user is populated with the decoded payload.
 * On failure:  passes an AppError to the global error handler.
 */

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');

/**
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to req.user.
 */
const protect = async (req, _res, next) => {
  try {
    // 1. Read token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided. Access denied.', 401, 'NO_TOKEN'));
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify signature and expiry
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // 3. Attach user payload to request
    //    Full user hydration from DB can be added here later:
    //    req.user = await User.findById(decoded.id).select('-passwordHash');
    req.user = decoded;

    return next();
  } catch (err) {
    // JsonWebTokenError / TokenExpiredError are handled by errorHandler.js
    return next(err);
  }
};

module.exports = { protect };
