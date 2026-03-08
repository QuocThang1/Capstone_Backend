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
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: false,
        },
        dob: {
            type: Date,
            required: false,
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: false,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: "tblaccount",
    }
);

module.exports = mongoose.model("Account", accountSchema);