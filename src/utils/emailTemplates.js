const EMAIL_TEMPLATE_KEYS = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    SYSTEM_TEST: "SYSTEM_TEST",
};

const defaultEmailTemplates = {
    [EMAIL_TEMPLATE_KEYS.OTP_VERIFICATION]: {
        key: EMAIL_TEMPLATE_KEYS.OTP_VERIFICATION,
        name: "OTP verification email",
        subject: "TASKA - Your Verification Code",
        text: "Your TASKA verification code is {{otp}}. This code will expire in {{expiresInMinutes}} minutes.",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Arial', sans-serif; background-color: #f8f9fa; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { text-align: center; color: #1a202c; margin-bottom: 30px; }
    .header h1 { font-size: 28px; font-weight: 700; margin: 0; color: #2d3748; }
    .header p { font-size: 16px; color: #718096; margin: 10px 0 0 0; }
    .code { font-size: 32px; font-weight: 800; color: #3182ce; text-align: center; margin: 30px 0; letter-spacing: 4px; background: #edf2f7; padding: 20px; border-radius: 8px; }
    .footer { text-align: center; color: #a0aec0; font-size: 14px; margin-top: 30px; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to TASKA</h1>
      <p>Your verification code is:</p>
    </div>
    <div class="code">{{otp}}</div>
    <div class="footer">
      <p>This code will expire in {{expiresInMinutes}} minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
        `,
        variables: ["otp", "expiresInMinutes"],
    },
    [EMAIL_TEMPLATE_KEYS.SYSTEM_TEST]: {
        key: EMAIL_TEMPLATE_KEYS.SYSTEM_TEST,
        name: "System test email",
        subject: "TASKA Test Email",
        text: "{{message}}",
        html: "<p>{{message}}</p>",
        variables: ["message"],
    },
};

module.exports = {
    EMAIL_TEMPLATE_KEYS,
    defaultEmailTemplates,
};
