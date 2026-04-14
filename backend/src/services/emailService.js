'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');

const sendVerificationEmail = async (to, otp, isPasswordReset = false) => {
  // We will repurpose SMTP_USER for the Webhook URL and SMTP_PASS for the Webhook Secret!
  const webhookUrl = env.SMTP_USER; 
  const webhookSecret = env.SMTP_PASS;

  if (!webhookUrl || !webhookSecret || !webhookUrl.startsWith('https://script.google.com')) {
    logger.warn('Google Apps Script Webhook not fully configured. OTP will be printed to console only.');
    logger.info(`[MOCK EMAIL] To: ${to} | OTP: ${otp}`);
    return;
  }

  const subject = isPasswordReset ? 'Your Password Reset Code' : 'Your Verification Code';
  const heading = isPasswordReset ? 'Password Reset' : 'Welcome to Sc₹awnySpend!';
  const message = isPasswordReset ? 'Your password reset code is:' : 'Your one-time verification code is:';

  const htmlPayload = `
    <div style="font-family: sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #f59e0b;">${heading}</h2>
      <p>${message}</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e212b;">${otp}</h1>
      <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
    </div>
  `;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        to: to,
        subject: subject,
        htmlBody: htmlPayload,
        secret: webhookSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with status: ${response.status}`);
    }

    logger.info(`Verification email forwarded to Apps Script for ${to}`);
  } catch (err) {
    logger.error(`Failed to forward email to Apps Script for ${to}: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendVerificationEmail,
};
