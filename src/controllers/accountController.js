const {
    handleSignUpService,
    handleLoginService,
    getAccountService,
    updateProfileService,
} = require("../services/accountService");
const { StatusCodes } = require("http-status-codes");

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
        const { username, password } = req.body;

        const data = await handleLoginService(username, password);

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

module.exports = {
    handleSignUp,
    handleLogin,
    getAccount,
    updateProfile,
};