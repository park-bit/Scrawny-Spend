'use strict';

/**
 * src/utils/responseHelper.js
 *
 * Enforces a consistent JSON envelope across all API responses:
 *
 *   Success  →  { success: true,  data: {...},   meta: {...} }
 *   Error    →  { success: false, error: { message, code } }
 *
 * Import sendSuccess / sendError in controllers instead of
 * calling res.json() directly.
 */

/**
 * @param {import('express').Response} res
 * @param {*} data           - Payload to return
 * @param {string} [message] - Optional human-readable message
 * @param {number} [status]  - HTTP status (default 200)
 * @param {object} [meta]    - Pagination, counts, etc.
 */
const sendSuccess = (res, data, message = 'OK', status = 200, meta = {}) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(Object.keys(meta).length > 0 && { meta }),
  });
};

/**
 * @param {import('express').Response} res
 * @param {string} message   - Human-readable error description
 * @param {number} [status]  - HTTP status (default 500)
 * @param {string} [code]    - Machine-readable error code
 */
const sendError = (res, message, status = 500, code = 'INTERNAL_ERROR') => {
  return res.status(status).json({
    success: false,
    error: { message, code },
  });
};

module.exports = { sendSuccess, sendError };
