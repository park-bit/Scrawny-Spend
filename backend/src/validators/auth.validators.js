'use strict';

const Joi = require('joi');

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const emailField = Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required()
  .messages({ 'string.email': 'Please provide a valid email address.', 'any.required': 'Email is required.' });

const passwordField = Joi.string().min(8).max(128).pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/).required()
  .messages({
    'string.min':          'Password must be at least 8 characters.',
    'string.pattern.base': 'Password must contain at least one letter and one number.',
    'any.required':        'Password is required.',
  });

const nameField = Joi.string().min(2).max(80).trim().pattern(/^[A-Za-z\s\-']+$/).required()
  .messages({
    'string.min':          'Name must be at least 2 characters.',
    'string.pattern.base': 'Name may only contain letters, spaces, hyphens, and apostrophes.',
    'any.required':        'Name is required.',
  });

/** POST /api/auth/register */
const registerSchema = Joi.object({
  name:     nameField,
  email:    emailField,
  password: passwordField,
  currency: Joi.string().valid(...CURRENCIES).default('INR'),
});

/** POST /api/auth/login */
const loginSchema = Joi.object({
  email:    emailField,
  password: Joi.string().required().messages({ 'any.required': 'Password is required.' }),
});

/** POST /api/auth/refresh */
const refreshSchema = Joi.object({
  refreshToken: Joi.string().required().messages({ 'any.required': 'Refresh token is required.' }),
});

/**
 * PATCH /api/auth/me
 * At least one of name or currency must be provided.
 */
const updateProfileSchema = Joi.object({
  name:         Joi.string().min(2).max(80).trim().pattern(/^[A-Za-z\s\-']+$/),
  currency:     Joi.string().valid(...CURRENCIES),
  geminiApiKey: Joi.string().allow('', null),
}).min(1).messages({ 'object.min': 'Provide at least one field to update.' });

/**
 * POST /api/auth/change-password
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({ 'any.required': 'Current password is required.' }),
  newPassword:     passwordField.label('New password'),
});

/** POST /api/auth/verify-otp */
const verifyOtpSchema = Joi.object({
  email: emailField,
  otp:   Joi.string().length(6).required().messages({ 'any.required': 'OTP is required.', 'string.length': 'OTP must be exactly 6 characters.' }),
});

/** POST /api/auth/request-password-reset */
const requestPasswordResetSchema = Joi.object({
  email: emailField,
});

/** POST /api/auth/reset-password */
const resetPasswordSchema = Joi.object({
  email: emailField,
  otp:   Joi.string().length(6).required(),
  newPassword: passwordField.label('New password'),
});

module.exports = {
  registerSchema, loginSchema, refreshSchema,
  updateProfileSchema, changePasswordSchema, verifyOtpSchema,
  requestPasswordResetSchema, resetPasswordSchema,
};
