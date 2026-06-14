const accountDAO = require("../DAO/accountDAO");
const {
    handleSignUpService,
    handleLoginService,
    getAccountService,
    updateProfileService,
    toggleStarProjectService,
    getStarredProjectsService,
    forgotPasswordService,
    changePasswordService
} = require("../services/accountService");
const { StatusCodes } = require("http-status-codes");
const OTP = require("../models/otp");
const { sendSystemMail } = require("../utils/mailer");
const { EMAIL_TEMPLATE_KEYS } = require("../utils/emailTemplates");
const { renderEmailTemplate } = require("../services/emailTemplateService");
const ApiError = require("../utils/ApiError");
const { getOrCreateSystemSettings } = require("../services/adminSettingsService");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeLoginAuditLog = (req, user) => createAuditLog(req, {
    actorId: user?._id,
    actor: user?.fullName || user?.email || user?.username || "User",
    action: "User logged in",
    target: user?.email || user?.username || "User account",
    details: "Logged in with password.",
}).catch((error) => console.error("Unable to write audit log:", error.message));

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeOtp = (otp) => String(otp || "").trim();

const handleSignUp = async (req, res, next) => {
    try {
        const { username, password, fullName, email, phone, dob, gender, skills } = req.body;

        const data = await handleSignUpService({
            username,
            password,
            fullName,
            email: normalizeEmail(email),
            phone,
            dob,
            gender,
            skills
        });

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "User created successfully",
            access_token: data.access_token,
            data: data.user
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
        await writeLoginAuditLog(req, data.user);

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
        const { username, fullName, email, phone, dob, gender, skills } = req.body;
        const userId = req.user._id;

        const user = await updateProfileService(userId, {
            username,
            fullName,
            email,
            phone,
            dob,
            gender,
            skills
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
        const email = normalizeEmail(req.body.email);
        const type = req.body.type || 'register';
        const settings = await getOrCreateSystemSettings();

        if (!email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Email is required"
            });
        }

        // Check if email exists
        const existingUser = await accountDAO.findByEmail(email);
        
        if (type === 'register' && existingUser) {
            return res.status(StatusCodes.CONFLICT).json({
                EC: 1,
                EM: "Email is already registered"
            });
        }
        
        if ((type === 'forgot_password' || type === 'change_password') && !existingUser) {
            return res.status(StatusCodes.NOT_FOUND).json({
                EC: 1,
                EM: "Email is not registered in the system"
            });
        }

        if (!settings.enableEmailNotifications || !settings.enableOtpEmail) {
            throw new ApiError(StatusCodes.FORBIDDEN, "OTP email is currently disabled");
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Xóa OTP cũ
        await OTP.deleteMany({ email });

        // Tạo expiresAt (10 phút)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Tạo OTP mới với expiresAt
        const newOtp = new OTP({ email, otp, expiresAt });
        await newOtp.save();

        const otpEmail = await renderEmailTemplate(EMAIL_TEMPLATE_KEYS.OTP_VERIFICATION, {
            otp,
            expiresInMinutes: 10,
        });
        await sendSystemMail({
            to: email,
            ...otpEmail,
        });

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "OTP sent successfully",
            expiresAt: expiresAt.toISOString() // FE dùng để countdown
        });
    } catch (error) {
        console.error("Send OTP error:", error);
        next(error);
    }
};

const verifyOTP = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = normalizeOtp(req.body.otp);

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

        // Kiểm tra hết hạn
        if (otpDoc.expiresAt && otpDoc.expiresAt < new Date()) {
            // Xóa OTP hết hạn
            await OTP.deleteOne({ _id: otpDoc._id });
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "OTP has expired"
            });
        }

        otpDoc.verified = true;
        await otpDoc.save();

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "OTP verified successfully"
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        next(error);
    }
};

const toggleStarProject = async (req, res, next) => {
    try {
        const accountId = req.user._id;
        const { projectId } = req.body;

        if (!projectId) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Project ID is required.");
        }

        const result = await toggleStarProjectService(accountId, projectId);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: result.starredProjects
        });
    } catch (error) {
        next(error);
    }
};

const getStarredProjects = async (req, res, next) => {
    try {
        const accountId = req.user._id;
        const projects = await getStarredProjectsService(accountId);
        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: projects
        });
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = normalizeOtp(req.body.otp);
        const { newPassword } = req.body;
        const settings = await getOrCreateSystemSettings();
        if (!settings.enablePasswordResetEmail) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Password reset email is currently disabled");
        }

        if (!email || !otp || !newPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Email, OTP, and new password are required"
            });
        }

        // Verify OTP
        const otpDoc = await OTP.findOne({ email, otp });
        if (!otpDoc) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Invalid or expired OTP"
            });
        }

        // Delete the OTP after verification
        await OTP.deleteOne({ _id: otpDoc._id });

        // Reset password
        const result = await forgotPasswordService(email, newPassword);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Password reset successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { oldPassword, newPassword } = req.body;
        const otp = normalizeOtp(req.body.otp);

        if (!oldPassword || !otp || !newPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Old password, OTP, and new password are required"
            });
        }

        // Verify OTP
        const email = normalizeEmail(req.user.email);
        const otpDoc = await OTP.findOne({ email, otp });
        if (!otpDoc) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Invalid or expired OTP"
            });
        }

        // Delete the OTP after verification
        await OTP.deleteOne({ _id: otpDoc._id });

        // Change password
        const result = await changePasswordService(userId, oldPassword, newPassword);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Password changed successfully",
            data: result
        });
    } catch (error) {
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
    toggleStarProject,
    getStarredProjects,
    forgotPassword,
    changePassword
};
