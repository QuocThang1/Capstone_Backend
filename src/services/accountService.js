const accountDAO = require("../DAO/accountDAO");
const projectDAO = require("../DAO/projectDAO");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const saltRounds = 10;

const handleSignUpService = async ({ username, password, fullName, email, phone, dob, gender }) => {
    // If username is not provided, generate it from email (first part before @)
    const finalUsername = username || email.split('@')[0];

    const existingUser = await accountDAO.findByUsername(finalUsername);
    const existingEmail = await accountDAO.findByEmail(email);

    if (existingEmail) {
        throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
    }

    if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserData = {
        role: "user",
        username: finalUsername,
        password: hashedPassword,
        fullName,
        email,
        phone,
        dob,
        gender,
    };

    const newUser = await accountDAO.createAccount(newUserData);
    return newUser;
};

const handleLoginService = async (usernameOrEmail, password) => {
    // Support both username and email login
    let user = await accountDAO.findByUsername(usernameOrEmail);

    if (!user) {
        user = await accountDAO.findByEmail(usernameOrEmail);
    }

    if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Username or Password is not correct");
    }

    if (!user.active) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deactivated. Please contact administrator");
    }

    if (!user.password) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Username or Password is not correct");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Username or Password is not correct");
    }

    const payload = {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        gender: user.gender,
        role: user.role,
    };

    const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return {
        access_token,
        user: payload,
    };
};

const getAccountService = async (userId) => {
    const user = await accountDAO.getAccountByID(userId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    return user;
};

const updateProfileService = async (userId, { username, fullName, email, phone, dob, gender }) => {
    const existingUser = await accountDAO.getAccountByID(userId);
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Kiểm tra username trùng
    if (username && username !== existingUser.username) {
        const usernameExists = await accountDAO.findByUsername(username);
        if (usernameExists) {
            throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
        }
    }

    const updateData = {
        username: username || existingUser.username,
        fullName: fullName || existingUser.fullName,
        email: email || existingUser.email,
        phone: phone || existingUser.phone,
        dob: dob || existingUser.dob,
        gender: gender || existingUser.gender,
    };

    const updatedUser = await accountDAO.updateProfile(userId, updateData);
    return updatedUser;
};

const toggleStarProjectService = async (accountId, projectId) => {
    // Lấy thông tin tài khoản để xem danh sách đã star
    const account = await accountDAO.getAccountByID(accountId);
    if (!account) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Account not found.");
    }

    // Kiểm tra xem user có phải là thành viên của project không
    const projectMember = await projectDAO.checkMemberExists(projectId, accountId);
    if (!projectMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You can only star projects you are a member of.");
    }

    const isCurrentlyStarred = account.starredProjects.some(project => project._id.toString() === projectId);

    let updatedAccount;
    let message;

    if (isCurrentlyStarred) {
        // Nếu đã star -> unstar
        updatedAccount = await accountDAO.unstarProject(accountId, projectId);
        message = "Project unstarred successfully.";
    } else {
        // Nếu chưa star -> star
        updatedAccount = await accountDAO.starProject(accountId, projectId);
        message = "Project starred successfully.";
    }

    return {
        message,
        starredProjects: updatedAccount.starredProjects
    };
};

const getStarredProjectsService = async (accountId) => {
    const account = await accountDAO.getAccountByID(accountId);
    if (!account) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Account not found.");
    }
    return account.starredProjects;
};

module.exports = {
    handleSignUpService,
    handleLoginService,
    getAccountService,
    updateProfileService,
    toggleStarProjectService,
    getStarredProjectsService,
};