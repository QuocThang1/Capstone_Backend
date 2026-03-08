const {
    getAllUsersService,
    getUserByIdService,
    createUserService,
    updateUserService,
    toggleUserStatusService,
    deleteUserService,
} = require("../services/userService");
const { StatusCodes } = require("http-status-codes");

const getAllUsers = async (req, res, next) => {
    try {
        const result = await getAllUsersService(req.query);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await getUserByIdService(userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    try {
        const { username, password, fullName, email, phone, dob, gender, role, active } = req.body;

        const user = await createUserService({
            username,
            password,
            fullName,
            email,
            phone,
            dob,
            gender,
            role,
            active
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

const updateUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const adminId = req.user._id;
        const updateData = req.body;

        const user = await updateUserService(userId, updateData, adminId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "User updated successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

const toggleUserStatus = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const adminId = req.user._id;

        const result = await toggleUserStatusService(userId, adminId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: result.user
        });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const adminId = req.user._id;

        const result = await deleteUserService(userId, adminId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
};