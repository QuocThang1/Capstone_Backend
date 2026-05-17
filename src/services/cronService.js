const cron = require('node-cron');
const { generateDueIssueNotifications } = require('./notificationService');
const { checkWaitTimeBottleneck } = require('./bottleneckEngine');

const startCronJobs = (io) => {
    // 0 8 * * * - * * * * *
    cron.schedule('0 8 * * *', async () => {
        console.log("Running scheduled job: Check for issues due today...");
        await generateDueIssueNotifications(io);

        console.log("Running scheduled job: Check for bottlenecks...");
        await checkWaitTimeBottleneck(io);
    });
};

module.exports = { startCronJobs };