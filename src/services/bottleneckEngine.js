const issueDAO = require("../DAO/issueDAO");
const bottleneckDAO = require("../DAO/bottleneckDAO");
const historyDAO = require("../DAO/historyDAO");
const { getOrCreateSystemSettings } = require("./adminSettingsService");

const checkWaitTimeBottleneck = async (io, projectId) => {
    console.log("Checking Wait Time Bottleneck...");
    const now = new Date();

    const activeIssues = await issueDAO.getIssues({
        projectId: projectId,
        resolution: { $ne: "Done" },
        startDate: { $lte: now, $ne: null },
        dueDate: { $ne: null },
        timeExpect: { $gt: 0 }
    });

    for (const issue of activeIssues) {
        const histories = await historyDAO.getHistoryByIssueId(issue._id);
        const hasStatusChanged = histories.some((h) => h.field === "Status" && new Date(h.createdAt) >= new Date(issue.startDate));

        if (!hasStatusChanged) {
            const hoursWaited = (now - new Date(issue.startDate)) / (1000 * 60 * 60);
            const timeDuration = (new Date(issue.dueDate) - new Date(issue.startDate)) / (1000 * 60 * 60);
            const timeBuffer = timeDuration - issue.timeExpect;
            const warningThreshold = timeBuffer / 2;

            if (hoursWaited > warningThreshold) {
                // Nhánh 1: Quét tồn đọng cá nhân (Stagnation Warning)
                const stagnationRecord = await bottleneckDAO.createOrUpdateBottleneck({
                    projectId: projectId,
                    issueId: issue._id,
                    name: "Stagnation Warning",
                    content: `Task has not been started. Waited for ${hoursWaited.toFixed(1)} hours (exceeds 50% of Time Buffer: ${warningThreshold.toFixed(1)} hrs).`,
                    level: issue.priority,
                    isResolved: false
                });

                if (io) {
                    io.to(projectId.toString()).emit("bottleneck_alert", stagnationRecord);
                }

                // Nhánh 2: Quét thắt cổ chai dây chuyền (Bottleneck Alert)
                if (issue.parentId) {
                    // issue.parentId có thể là object (do populate) hoặc ObjectId
                    const parentId = issue.parentId._id || issue.parentId;
                    const fullParentIssue = await issueDAO.getIssueById(parentId);

                    if (fullParentIssue) {
                        const bottleneckRecord = await bottleneckDAO.createOrUpdateBottleneck({
                            projectId: projectId,
                            issueId: parentId,
                            name: "Bottleneck Alert",
                            content: `Blocked by child issue: ${issue.issueKey}. Child has been stagnant for ${hoursWaited.toFixed(1)} hours (exceeds 50% of Time Buffer: ${warningThreshold.toFixed(1)} hrs).`,
                            level: fullParentIssue.priority,
                            isResolved: false
                        });

                        if (io) {
                            io.to(projectId.toString()).emit("bottleneck_alert", bottleneckRecord);
                        }
                    }
                }
            }
        }
    }
};

module.exports = { checkWaitTimeBottleneck };
