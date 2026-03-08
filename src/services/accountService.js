const accountDAO = require("../DAO/accountDAO");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const saltRounds = 10;

const handleSignUpService = async ({ username, password, fullName, email, phone, dob, gender }) => {
    const existingUser = await accountDAO.findByUsername(username);
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
        username,
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

const handleLoginService = async (username, password) => {

    const user = await accountDAO.findByUsername(username);
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


module.exports = {
    handleSignUpService,
    handleLoginService,
    getAccountService,
    updateProfileService,
};