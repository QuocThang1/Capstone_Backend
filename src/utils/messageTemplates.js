const defaultMessageTemplates = [
    {
        key: "PLATFORM_MAINTENANCE",
        name: "Scheduled maintenance",
        title: "Scheduled Maintenance",
        message: "TASKA will undergo scheduled maintenance. Please save your work before the maintenance window begins.",
        type: "Maintenance",
        channels: ["In-App", "Email"],
    },
    {
        key: "SECURITY_NOTICE",
        name: "Security notice",
        title: "Security Notice",
        message: "Please review your account security settings and report any unfamiliar activity to the support team.",
        type: "Warning",
        channels: ["In-App", "Email"],
    },
    {
        key: "PLATFORM_ANNOUNCEMENT",
        name: "Platform announcement",
        title: "TASKA Announcement",
        message: "We have an important platform update to share with you.",
        type: "Info",
        channels: ["In-App"],
    },
];

module.exports = {
    defaultMessageTemplates,
};
