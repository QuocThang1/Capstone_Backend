const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        ownerEmail: {
            type: String,
            required: false,
            lowercase: true,
            trim: true,
        },
        ownerIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Account",
            }
        ],
        users: {
            type: Number,
            default: 1,
            min: 0,
        },
        projects: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["Active", "Suspended"],
            default: "Active",
        },
    },
    {
        timestamps: true,
        collection: "tblorganization",
    }
);

organizationSchema.index({ name: 1 });
organizationSchema.index({ ownerEmail: 1 });
organizationSchema.index({ status: 1 });

module.exports = mongoose.model("Organization", organizationSchema);
