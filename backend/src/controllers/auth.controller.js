'use strict';

const authService     = require('../services/authService');
const { sendSuccess } = require('../utils/responseHelper');

const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    return sendSuccess(res, { user, accessToken, refreshToken }, 'Account created successfully.', 201);
  } catch (err) { return next(err); }
};

const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    return sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful.');
  } catch (err) { return next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    return sendSuccess(res, tokens, 'Tokens refreshed successfully.');
  } catch (err) { return next(err); }
};

const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (err) { return next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, { user }, 'Profile retrieved.');
  } catch (err) { return next(err); }
};

/** PATCH /api/auth/me  – update name and/or currency */
const updateMe = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, { user, accessToken, refreshToken }, 'Profile updated.');
  } catch (err) { return next(err); }
};

/** POST /api/auth/change-password */
const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    return sendSuccess(res, null, 'Password changed successfully.');
  } catch (err) { return next(err); }
};

module.exports = { register, login, refresh, logout, getMe, updateMe, changePassword };
