const Account = require("../models/account");

class AccountDAO {
    async createAccount(data) {
        const newAccount = new Account(data);
        return await newAccount.save();
    }

    async findByUsername(username) {
        return await Account.findOne({ username });
    }

}

module.exports = new AccountDAO();