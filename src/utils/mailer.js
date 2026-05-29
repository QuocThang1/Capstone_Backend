const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendInvitationEmail = async (toEmail, inviterName, projectName, acceptLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `Invitation to join the project ${projectName} on Taska`,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #333;">Hello,</h2>
                <p>You have been invited by <strong>${inviterName}</strong> to join the project <strong>${projectName}</strong> as a member.</p>
                <p>To accept the invitation and start collaborating, please click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${acceptLink}" style="padding: 12px 25px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p style="color: #555;"><i>This link will expire in 3 days!</i></p>
                <p style="color: #999; font-size: 12px;">If you do not wish to join, please ignore this email.</p>
            </div>
        `
  };
  return transporter.sendMail(mailOptions);
};

module.exports = { transporter, sendInvitationEmail };