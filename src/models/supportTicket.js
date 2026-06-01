const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
    {
        ticketCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        organization: {
            type: String,
            required: true,
            trim: true,
        },
        reporterEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "tblsupporttickets",
    }
);

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ subject: "text", organization: "text", reporterEmail: "text" });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
