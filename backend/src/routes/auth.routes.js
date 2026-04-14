'use strict';

/**
 * src/routes/auth.routes.js
 * Mounted at: /api/auth
 *
 *   POST  /register         – create account
 *   POST  /login            – authenticate
 *   POST  /refresh          – rotate tokens
 *   POST  /logout           – client-side token discard
 *   GET   /me               – get own profile
 *   PATCH /me               – update name / currency
 *   POST  /change-password  – change password (requires current password)
 */

const router = require('express').Router();
const { authLimiter }  = require('../middleware/rateLimiter');
const { validate }     = require('../middleware/validate');
const { protect }      = require('../middleware/auth');
const authController   = require('../controllers/auth.controller');
const {
  registerSchema, loginSchema, refreshSchema,
  updateProfileSchema, changePasswordSchema, verifyOtpSchema,
} = require('../validators/auth.validators');

router.use(authLimiter);

// Public
router.post('/register',        validate(registerSchema),       authController.register);
router.post('/verify-otp',      validate(verifyOtpSchema),      authController.verifyOtp);
router.post('/login',           validate(loginSchema),          authController.login);
router.post('/refresh',         validate(refreshSchema),        authController.refresh);
router.post('/logout',                                          authController.logout);

// Protected
router.get('/me',               protect,                        authController.getMe);
router.patch('/me',             protect, validate(updateProfileSchema), authController.updateMe);
router.post('/change-password', protect, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
