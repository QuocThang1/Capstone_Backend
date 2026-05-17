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
            required: false,
            unique: true,
            sparse: true,
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
            unique: true,
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
        avatar: {
            type: String,
            required: false,
        },
        googleId: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
        },
        githubId: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
        },
        authProvider: {
            type: String,
            enum: ["local", "google", "github"],
            default: "local",
        },
        active: {
            type: Boolean,
            default: true,
        },
        starredProjects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project"
        }]
    },
    {
        timestamps: true,
        collection: "tblaccount",
    }
);

module.exports = mongoose.model("Account", accountSchema);