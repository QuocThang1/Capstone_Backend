const {
    handleSignUpService,
} = require("../services/accountService");
const { StatusCodes } = require("http-status-codes");

const handleSignUp = async (req, res, next) => {
    try {
        const { username, password, fullName } = req.body;

        const user = await handleSignUpService({
            username,
            password,
            fullName,
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

module.exports = {
    handleSignUp,
};