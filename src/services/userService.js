const userDAO = require("../DAO/userDAO");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const saltRounds = 10;

const getAllUsersService = async (query) => {
    const { page = 1, limit = 10, search, role, gender, active } = query;

    const filter = {};

    if (search) {
        filter.$or = [
            { username: { $regex: search, $options: 'i' } },
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (role) {
        filter.role = role;
    }

    if (gender) {
        filter.gender = gender;
    }

    if (active === 'true' || active === 'false') {
        filter.active = active === 'true';
    }

    const result = await userDAO.getAllUsers(filter, parseInt(page), parseInt(limit));
    return result;
};

const getUserByIdService = async (userId) => {
    const user = await userDAO.getUserById(userId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }
    return user;
};

const createUserService = async ({ username, password, fullName, email, phone, dob, gender, role, active }) => {
    const existingUsername = await userDAO.findByUsername(username);
    if (existingUsername) {
        throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
    }

    const existingEmail = await userDAO.findByEmail(email);
    if (existingEmail) {
        throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserData = {
        username,
        password: hashedPassword,
        fullName,
        email,
        phone,
        dob,
        gender,
        role: role || "user",
        active: active !== undefined ? active : true,
    };

    const newUser = await userDAO.createUser(newUserData);

    // Loại bỏ password trước khi trả về
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return userResponse;
};

const updateUserService = async (userId, updateData, adminId) => {
    // Cho phép user update profile của chính mình hoặc admin update user khác
    // Chỉ prevent admin tự update account của mình thông qua admin panel (nếu cần)
    // Bỏ comment này nếu muốn enforce: if (userId === adminId.toString()) { throw ... }

    const existingUser = await userDAO.getUserById(userId);
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Kiểm tra username trùng
    if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await userDAO.findByUsername(updateData.username);
        if (usernameExists) {
            throw new ApiError(StatusCodes.CONFLICT, "Username already exists");
        }
    }

    // Kiểm tra email trùng
    if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await userDAO.findByEmail(updateData.email);
        if (emailExists) {
            throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
        }
    }

    // Validate role nếu có (chỉ admin có quyền thay đổi)
    if (updateData.role && userId !== adminId.toString()) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only admins can change user roles");
    }

    if (updateData.role) {
        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(updateData.role)) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid role");
        }
    }

    // Nếu có password, hash nó
    if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const updatedUser = await userDAO.updateUser(userId, updateData);
    return updatedUser;
};

const toggleUserStatusService = async (userId, adminId) => {
    if (userId === adminId.toString()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot change your own account status");
    }

    const existingUser = await userDAO.getUserById(userId);
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const newStatus = !existingUser.active;
    const updatedUser = await userDAO.updateUserStatus(userId, newStatus);

    return {
        user: updatedUser,
        message: newStatus ? "User activated successfully" : "User deactivated successfully"
    };
};

const deleteUserService = async (userId, adminId) => {
    if (userId === adminId.toString()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot delete your own account");
    }

    const user = await userDAO.getUserById(userId);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    await userDAO.deleteUser(userId);
    return { message: "User deleted successfully" };
};

module.exports = {
    getAllUsersService,
    getUserByIdService,
    createUserService,
    updateUserService,
    toggleUserStatusService,
    deleteUserService,
};