'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (to, otp) => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP credentials not configured. OTP will be printed to console only.');
    logger.info(`[MOCK EMAIL] To: ${to} | OTP: ${otp}`);
    return;
  }

  const mailOptions = {
    from: `"Sc₹awnySpend" <${env.SMTP_USER}>`,
    to,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #f59e0b;">Welcome to Sc₹awnySpend!</h2>
        <p>Your one-time verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e212b;">${otp}</h1>
        <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${to}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendVerificationEmail,
};
