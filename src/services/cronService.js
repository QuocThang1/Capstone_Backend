const cron = require('node-cron');
const { generateDueIssueNotifications } = require('./notificationService');

const startCronJobs = (io) => {
    // 0 8 * * * - * * * * *
    cron.schedule('0 8 * * *', async () => {
        console.log("Running scheduled job: Check for issues due today...");
        await generateDueIssueNotifications(io);
    });
};

module.exports = { startCronJobs };