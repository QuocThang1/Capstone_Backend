const Account = require("../models/account");

class AccountDAO {
    async createAccount(data) {
        const newAccount = new Account(data);
        return await newAccount.save();
    }

    async findByUsername(username) {
        return await Account.findOne({ username });
    }

    async findByEmail(email) {
        return await Account.findOne({ email });
    }

    async getAccountByID(userId) {
        return await Account.findById(userId)
            .select("-password")
            .populate({
                path: 'starredProjects',
                select: 'name key description members' // Chọn các trường cần thiết của project
            });
    }

    async getAccountsByIds(accountIds) {
        return await Account.find({ _id: { $in: accountIds } })
            .select("_id fullName username email skills role");
    }

    async updatePassword(userId, hashedPassword) {
        return await Account.findByIdAndUpdate(
            userId,
            { $set: { password: hashedPassword } },
            { new: true }
        );
    }

    async updateProfile(userId, updateData) {
        return await Account.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select('-password');
    }

    async starProject(accountId, projectId) {
        return await Account.findByIdAndUpdate(
            accountId,
            { $addToSet: { starredProjects: projectId } }, // $addToSet để tránh trùng lặp
            { new: true }
        );
    }

    async unstarProject(accountId, projectId) {
        return await Account.findByIdAndUpdate(
            accountId,
            { $pull: { starredProjects: projectId } }, // $pull để xóa
            { new: true }
        );
    }
}

module.exports = new AccountDAO();