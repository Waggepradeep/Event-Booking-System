// src/utils/emailSender.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail(to, subject, text, attachmentPath) {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!to) {
    throw new Error('Recipient email is missing');
  }
  if (!emailUser || !emailPass) {
    throw new Error('Email credentials are missing in environment variables');
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const mailOptions = {
    from: `"Event Booking" <${emailUser}>`,
    to,
    subject,
    text,
    attachments: attachmentPath ? [{ filename: 'ticket.pdf', path: attachmentPath }] : [],
  };

  console.log("📧 Sending email to:", to); // debug
  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
