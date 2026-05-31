const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

const transporterSendMail = transporter.sendMail.bind(transporter);

const sendSystemMail = ({ from, ...options }) => transporterSendMail({
  from: from || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
  ...options,
});

module.exports = transporter;
module.exports.sendSystemMail = sendSystemMail;
