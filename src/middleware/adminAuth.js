require("dotenv").config();
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const authAdmin = (req, res, next) => {
    if (!req.headers.authorization) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized access, no token provided");
    }

    const token = req.headers.authorization.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);


        if (decoded.role !== "admin") {
            throw new ApiError(StatusCodes.FORBIDDEN, `Access denied. Admin only. Your role: ${decoded.role}`);
        }

        req.user = {
            email: decoded.email,
            fullName: decoded.fullName,
            username: decoded.username,
            dob: decoded.dob,
            gender: decoded.gender,
            phone: decoded.phone,
            _id: decoded.id,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid token");
        } else if (error.name === "TokenExpiredError") {
            throw new ApiError(StatusCodes.UNAUTHORIZED, "Token expired");
        }
        throw error;
    }
};

module.exports = authAdmin;