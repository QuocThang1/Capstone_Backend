const accountDAO = require("../DAO/accountDAO");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const saltRounds = 10;

const handleSignUpService = async ({ username, password, fullName }) => {
    const existingUser = await accountDAO.findByUsername(username);
    if (existingUser) {
        throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserData = {
        role: "user",
        username,
        password: hashedPassword,
        fullName,
    };

    const newUser = await accountDAO.createAccount(newUserData);
    return newUser;
};

module.exports = {
    handleSignUpService,
};