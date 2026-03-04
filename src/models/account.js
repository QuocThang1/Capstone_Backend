const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user",
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: false,
        },
        fullName: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "tblaccount",
    }
);

module.exports = mongoose.model("Account", accountSchema);