const {
    getAllUsersService,
    getUserByIdService,
    createUserService,
    updateUserService,
    toggleUserStatusService,
    deleteUserService,
} = require("../services/userService");
const { StatusCodes } = require("http-status-codes");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeAuditLog = (req, data) => createAuditLog(req, {
    actorId: req.user?._id,
    actor: req.user?.fullName || req.user?.email || "Admin",
    ...data,
}).catch((error) => console.error("Unable to write audit log:", error.message));

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
        const { username, password, fullName, email, phone, dob, gender, role, active, major } = req.body;

        const user = await createUserService({
            username,
            password,
            fullName,
            email,
            phone,
            dob,
            gender,
            major,
            role,
            active
        });
        await writeAuditLog(req, {
            action: "Platform user created",
            target: user.fullName || user.email,
            details: `Created platform user ${user.fullName || user.email}.`,
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
        await writeAuditLog(req, {
            action: "Platform user updated",
            target: user.fullName || user.email,
            details: `Updated platform user ${user.fullName || user.email}.`,
        });

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
        await writeAuditLog(req, {
            action: result.user.active ? "Platform user activated" : "Platform user locked",
            target: result.user.fullName || result.user.email,
            severity: "Warning",
            details: `Changed platform user status to ${result.user.active ? "active" : "locked"}.`,
        });

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
        await writeAuditLog(req, {
            action: "Platform user deleted",
            target: result.userName,
            severity: "Warning",
            details: `Deleted platform user ${result.userName}.`,
        });

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "No file uploaded",
                data: null
            });
        }

        const updateData = {
            avatar: req.file.secure_url || req.file.path
        };

        const user = await updateUserService(userId, updateData, req.user._id);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Avatar uploaded successfully",
            data: user
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
    uploadAvatar,
};
