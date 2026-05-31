const Account = require("../models/account");

class UserDAO {
    async getAllUsers(filter = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const users = await Account.find(filter)
            .select("-password")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Account.countDocuments(filter);

        return {
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getUserById(userId) {
        return await Account.findById(userId).select("-password");
    }

    async createUser(userData) {
        const newUser = new Account(userData);
        return await newUser.save();
    }

    async updateUser(userId, updateData) {
        return await Account.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).select('-password');
    }

    async updateUserStatus(userId, active) {
        return await Account.findByIdAndUpdate(
            userId,
            { $set: { active } },
            { returnDocument: 'after' }
        ).select('-password');
    }

    async deleteUser(userId) {
        return await Account.findByIdAndDelete(userId);
    }

    async findByUsername(username) {
        return await Account.findOne({ username });
    }

    async findByEmail(email) {
        return await Account.findOne({ email });
    }
}

module.exports = new UserDAO();
