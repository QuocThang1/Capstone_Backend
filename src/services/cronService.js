const cron = require('node-cron');
const projectDAO = require('../DAO/projectDAO');
const { generateDueIssueNotifications } = require('./notificationService');
const { checkWaitTimeBottleneck } = require('./bottleneckEngine');

const activeNotifJobs = {};
const activeBottleJobs = {};

const stopProjectCrons = (projectId) => {
    const id = projectId.toString();
    if (activeNotifJobs[id]) {
        activeNotifJobs[id].stop();
        delete activeNotifJobs[id];
    }
    if (activeBottleJobs[id]) {
        activeBottleJobs[id].stop();
        delete activeBottleJobs[id];
    }
};

const startProjectCrons = (project, io) => {
    const id = project._id.toString();
    stopProjectCrons(id); // Xoá task cũ

    // Kích hoạt quét thời hạn (Notification)
    if (project.isNotificationActive && project.notificationCron && cron.validate(project.notificationCron)) {
        activeNotifJobs[id] = cron.schedule(project.notificationCron, async () => {
            console.log(`[Cron: Notification] Running for project: ${id}`);
            await generateDueIssueNotifications(io, id);
        }, {
            timezone: project.timezone || 'UTC'
        });
        console.log(`[Cron: Notification] Started for project: ${id} [${project.notificationCron}] [${project.timezone || 'UTC'}]`);
    }

    // Kích hoạt quét ùn tắc (Bottleneck)
    if (project.isBottleneckActive && project.bottleneckCron && cron.validate(project.bottleneckCron)) {
        activeBottleJobs[id] = cron.schedule(project.bottleneckCron, async () => {
            console.log(`[Cron: Bottleneck] Running for project: ${id}`);
            await checkWaitTimeBottleneck(io, id);
        }, {
            timezone: project.timezone || 'UTC'
        });
        console.log(`[Cron: Bottleneck] Started for project: ${id} [${project.bottleneckCron}] [${project.timezone || 'UTC'}]`);
    }
};

const initializeAllCronJobs = async (io) => {
    try {
        console.log("[Cron] Booting up Dynamic Job Registration...");
        const allProjectsData = await projectDAO.getAllProjects({}, 1, 9999);

        allProjectsData.projects.forEach(project => {
            startProjectCrons(project, io);
        });
    } catch (err) {
        console.error("[Cron] Error initializing cron jobs: ", err);
    }
};

const rescheduleProjectCrons = (project, io) => {
    startProjectCrons(project, io);
};

module.exports = { startCronJobs: initializeAllCronJobs, rescheduleProjectCrons, stopProjectCrons };