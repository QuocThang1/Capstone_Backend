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
}

module.exports = new AccountDAO();