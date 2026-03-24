const {
    handleSignUpService,
    handleLoginService,
    getAccountService,
    updateProfileService,
} = require("../services/accountService");
const { StatusCodes } = require("http-status-codes");
const OTP = require("../models/otp");
const transporter = require("../utils/mailer");

const handleSignUp = async (req, res, next) => {
    try {
        const { username, password, fullName, email, phone, dob, gender } = req.body;

        const user = await handleSignUpService({
            username,
            password,
            fullName,
            email,
            phone,
            dob,
            gender
        });

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "User created successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

const handleLogin = async (req, res, next) => {
    try {
        const { usernameOrEmail, password, username } = req.body;
        
        // Support both old (username) and new (usernameOrEmail) formats
        const loginIdentifier = usernameOrEmail || username;

        const data = await handleLoginService(loginIdentifier, password);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Login successful",
            access_token: data.access_token,
            data: data.user
        });
    } catch (error) {
        next(error);
    }
};

const getAccount = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const user = await getAccountService(userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { username, fullName, email, phone, dob, gender } = req.body;
        const userId = req.user._id;

        const user = await updateProfileService(userId, {
            username,
            fullName,
            email,
            phone,
            dob,
            gender,
        });

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Profile updated successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

const sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Email is required"
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email });

        // Create new OTP
        const newOtp = new OTP({ email, otp });
        await newOtp.save();

        // Send email
        const html = `
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
    <div class="code">${otp}</div>
    <div class="footer">
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'TASKA - Your Verification Code',
            html: html
        };

        await transporter.sendMail(mailOptions);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Send OTP error:", error);
        next(error);
    }
};

const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Email and OTP are required"
            });
        }

        // Find the OTP
        const otpDoc = await OTP.findOne({ email, otp });

        if (!otpDoc) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Invalid or expired OTP"
            });
        }

        // Delete the OTP after successful verification
        await OTP.deleteOne({ _id: otpDoc._id });

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "OTP verified successfully"
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        next(error);
    }
};

module.exports = {
    handleSignUp,
    handleLogin,
    getAccount,
    updateProfile,
    sendOTP,
    verifyOTP,
};