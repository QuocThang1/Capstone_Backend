const cron = require("node-cron");
const projectDAO = require("../DAO/projectDAO");
const { generateDueIssueNotifications } = require("./notificationService");
const { checkWaitTimeBottleneck } = require("./bottleneckEngine");
const projectService = require("./projectService");

const activeNotifJobs = {};
const activeBottleJobs = {};
const cronMetadata = {};
const runningJobs = new Set();

const runTrackedJob = async (jobId, callback) => {
    runningJobs.add(jobId);
    try {
        await callback();
    } finally {
        runningJobs.delete(jobId);
    }
};

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
    delete cronMetadata[id];
};

const startProjectCrons = (project, io) => {
    const id = project._id.toString();
    stopProjectCrons(id); // Xoá task cũ

    // Kích hoạt quét thời hạn (Notification)
    if (project.isNotificationActive && project.notificationCron && cron.validate(project.notificationCron)) {
        activeNotifJobs[id] = cron.schedule(
            project.notificationCron,
            () =>
                runTrackedJob(`notification-${id}`, async () => {
                    console.log(`[Cron: Notification] Running for project: ${id}`);
                    await generateDueIssueNotifications(io, id);
                }),
            {
                timezone: project.timezone || "UTC"
            }
        );
        console.log(`[Cron: Notification] Started for project: ${id} [${project.notificationCron}] [${project.timezone || "UTC"}]`);
    }

    // Kích hoạt quét ùn tắc (Bottleneck)
    if (project.isBottleneckActive && project.bottleneckCron && cron.validate(project.bottleneckCron)) {
        activeBottleJobs[id] = cron.schedule(
            project.bottleneckCron,
            () =>
                runTrackedJob(`bottleneck-${id}`, async () => {
                    console.log(`[Cron: Bottleneck] Running for project: ${id}`);
                    await checkWaitTimeBottleneck(io, id);
                }),
            {
                timezone: project.timezone || "UTC"
            }
        );
        console.log(`[Cron: Bottleneck] Started for project: ${id} [${project.bottleneckCron}] [${project.timezone || "UTC"}]`);
    }

    cronMetadata[id] = {
        projectId: id,
        projectName: project.name,
        notificationCron: activeNotifJobs[id] ? project.notificationCron : null,
        bottleneckCron: activeBottleJobs[id] ? project.bottleneckCron : null
    };
};

const initializeAllCronJobs = async (io) => {
    try {
        console.log("[Cron] Booting up Dynamic Job Registration...");
        // Xóa project nháp
        cron.schedule(
            "0 0 * * *",
            async () => {
                console.log("[Cron: System] Running cleanup for AI Draft projects...");
                try {
                    // Lấy tất cả các project có isAiDraft: true
                    const draftsData = await projectDAO.getAllProjects({ isAiDraft: true }, 1, 9999);
                    for (const draft of draftsData.projects) {
                        try {
                            // Xóa project bằng quyền admin để bỏ qua check member
                            await projectService.deleteProjectService(draft._id, null, "admin");
                            console.log(`[Cron: System] Deleted draft project: ${draft._id}`);
                        } catch (err) {
                            console.error(`[Cron: System] Failed to delete draft ${draft._id}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error("[Cron: System] Error fetching draft projects: ", err);
                }
            },
            { timezone: "UTC" }
        );

        const allProjectsData = await projectDAO.getAllProjects({}, 1, 9999);

        allProjectsData.projects.forEach((project) => {
            startProjectCrons(project, io);
        });
    } catch (err) {
        console.error("[Cron] Error initializing cron jobs: ", err);
    }
};

const rescheduleProjectCrons = (project, io) => {
    startProjectCrons(project, io);
};

const getCronJobHealth = () => {
    const jobs = Object.values(cronMetadata).flatMap((project) => {
        const projectJobs = [];
        if (project.notificationCron) {
            projectJobs.push({
                id: `notification-${project.projectId}`,
                name: `Notification Dispatch - ${project.projectName}`,
                status: "Scheduled",
                schedule: project.notificationCron
            });
        }
        if (project.bottleneckCron) {
            projectJobs.push({
                id: `bottleneck-${project.projectId}`,
                name: `Bottleneck Detection - ${project.projectName}`,
                status: "Scheduled",
                schedule: project.bottleneckCron
            });
        }
        return projectJobs;
    });

    return {
        notificationJobs: Object.keys(activeNotifJobs).length,
        bottleneckJobs: Object.keys(activeBottleJobs).length,
        totalJobs: jobs.length,
        runningJobs: runningJobs.size,
        jobs
    };
};

module.exports = {
    startCronJobs: initializeAllCronJobs,
    rescheduleProjectCrons,
    stopProjectCrons,
    getCronJobHealth
};
