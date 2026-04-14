'use strict';

/**
 * src/services/authService.js
 */

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User   = require('../models/User');
const AppError = require('../utils/AppError');
const env    = require('../config/env');
const logger = require('../utils/logger');
const { sendVerificationEmail } = require('./emailService');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildPayload = (user) => ({
  id: user._id.toString(), email: user.email, name: user.name, currency: user.currency, hasGeminiKey: !!user.geminiApiKey,
});

const signAccessToken  = (p) => jwt.sign(p, env.JWT_SECRET, {
  expiresIn: env.JWT_EXPIRES_IN, issuer: 'expense-tracker-api', audience: 'expense-tracker-client',
});

const signRefreshToken = (p) => jwt.sign(
  { id: p.id, type: 'refresh' }, env.JWT_SECRET,
  { expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: 'expense-tracker-api', audience: 'expense-tracker-client' }
);

const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET, { issuer: 'expense-tracker-api', audience: 'expense-tracker-client' });
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      throw new AppError('Refresh token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    throw new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
  }
};

const generateTokenPair = (user) => ({
  accessToken:  signAccessToken(buildPayload(user)),
  refreshToken: signRefreshToken(buildPayload(user)),
});


const register = async ({ name, email, password, currency }) => {
  let user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiresAt');
  
  if (user) {
    if (user.isVerified) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }
    // Reprovision unverified user
    user.name = name;
    user.passwordHash = password;
    user.currency = currency || 'INR';
  } else {
    user = new User({ name, email, passwordHash: password, currency: currency || 'INR', isVerified: false });
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  logger.info(`OTP generated for: ${user.email}`);
  await sendVerificationEmail(user.email, otp);

  return { requiresOtp: true, email: user.email };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +geminiApiKey');
  const passwordMatch = user ? await user.comparePassword(password) : false;

  if (!user || !passwordMatch)
    throw new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  if (!user.isActive)
    throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_INACTIVE');
  if (user.isVerified === false) // Let undefined legacy accounts pass
    throw new AppError('Please verify your email to log in.', 401, 'NOT_VERIFIED');

  logger.info(`User logged in: ${user.email} (${user._id})`);
  const { accessToken, refreshToken } = generateTokenPair(user);
  return { user: user.toJSON(), accessToken, refreshToken };
};

const refreshTokens = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token is required.', 400, 'MISSING_REFRESH_TOKEN');
  const decoded = verifyToken(refreshToken);
  if (decoded.type !== 'refresh') throw new AppError('Invalid token type.', 401, 'INVALID_TOKEN');

  const user = await User.findById(decoded.id).select('+geminiApiKey');
  if (!user || !user.isActive)
    throw new AppError('User associated with this token no longer exists.', 401, 'USER_NOT_FOUND');
  return generateTokenPair(user);
};

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('+geminiApiKey');
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  return user.toJSON();
};

/**
 * Update profile fields — name and/or currency.
 * Returns a fresh token pair so the client's JWT stays in sync with the
 * updated name/currency embedded in the payload.
 */
const updateProfile = async (userId, { name, currency, geminiApiKey }) => {
  const updateFields = {};
  if (name)         updateFields.name         = name.trim();
  if (currency)     updateFields.currency     = currency;
  if (geminiApiKey !== undefined) updateFields.geminiApiKey = geminiApiKey;

  if (!Object.keys(updateFields).length)
    throw new AppError('No updateable fields provided.', 400, 'NO_FIELDS');

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select('+geminiApiKey');
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  logger.info(`Profile updated: ${user.email}`);

  // Re-issue token pair so embedded name/currency is fresh
  const { accessToken, refreshToken } = generateTokenPair(user);
  return { user: user.toJSON(), accessToken, refreshToken };
};

/**
 * Change password.
 * Verifies the current password before allowing a change.
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  const match = await user.comparePassword(currentPassword);
  if (!match) throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');

  // Assign plain value — the pre-save hook will hash it
  user.passwordHash = newPassword;
  await user.save();

  logger.info(`Password changed: ${user.email}`);
};

const verifyOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiresAt');
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  if (user.isVerified) throw new AppError('User is already verified.', 400, 'ALREADY_VERIFIED');

  if (!user.otp || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('Invalid or expired OTP.', 401, 'INVALID_OTP');
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  logger.info(`User verified: ${user.email}`);
  const { accessToken, refreshToken } = generateTokenPair(user);
  return { user: user.toJSON(), accessToken, refreshToken };
};

const requestPasswordReset = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  logger.info(`Password reset OTP generated for: ${user.email}`);
  await sendVerificationEmail(user.email, otp, true);
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiresAt');
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  if (!user.otp || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('Invalid or expired OTP.', 401, 'INVALID_OTP');
  }

  user.passwordHash = newPassword;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  logger.info(`Password successfully reset for: ${user.email}`);
};

module.exports = { register, login, refreshTokens, getProfile, updateProfile, changePassword, verifyOtp, requestPasswordReset, resetPassword };
