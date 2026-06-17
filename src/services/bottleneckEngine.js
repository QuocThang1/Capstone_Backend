const issueDAO = require("../DAO/issueDAO");
const bottleneckDAO = require("../DAO/bottleneckDAO");
const historyDAO = require("../DAO/historyDAO");
const projectDAO = require("../DAO/projectDAO");
const { getOrCreateSystemSettings } = require("./adminSettingsService");
const { sendTaskAlertEmail } = require("../utils/mailer");
const { env } = require("../config/env");

const checkWaitTimeBottleneck = async (io, projectId) => {
    console.log("Checking Wait Time Bottleneck...");
    const now = new Date();

    const project = await projectDAO.getProjectById(projectId);
    const projectName = project ? project.name : "Your Project";

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

                if (issue.assigneeId && issue.assigneeId.email) {
                    const assigneeName = issue.assigneeId.fullName || issue.assigneeId.username;
                    const taskLink = `${env.clientUrl}/projects/${projectId}/list?issueId=${issue._id}&intendedUser=${issue.assigneeId._id}`;
                    sendTaskAlertEmail(
                        issue.assigneeId.email,
                        assigneeName,
                        projectName,
                        issue.issueKey,
                        issue.title,
                        "Stagnation Warning",
                        "Your task has been stagnant for too long and is at risk of delaying the project. Please start working on it immediately.",
                        taskLink
                    ).catch((err) => console.error(`[Mailer] Failed to send stagnation email for ${issue.issueKey}:`, err.message));
                }

                // Nhánh 2: Quét thắt cổ chai dây chuyền (Bottleneck Alert)
                if (issue.parentId) {
                    const parentId = issue.parentId._id || issue.parentId;
                    const parentIssues = await issueDAO.getIssues({ _id: parentId });
                    const fullParentIssue = parentIssues.length > 0 ? parentIssues[0] : null;

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

                        if (fullParentIssue.assigneeId && fullParentIssue.assigneeId.email) {
                            const parentAssigneeName = fullParentIssue.assigneeId.fullName || fullParentIssue.assigneeId.username;
                            const taskLink = `${env.clientUrl}/projects/${projectId}/list?issueId=${fullParentIssue._id}&intendedUser=${fullParentIssue.assigneeId._id}`;
                            const blockerKey = issue.issueKey;
                            const blockerAssignee = issue.assigneeId ? issue.assigneeId.fullName || issue.assigneeId.username : "Unassigned";

                            sendTaskAlertEmail(
                                fullParentIssue.assigneeId.email,
                                parentAssigneeName,
                                projectName,
                                fullParentIssue.issueKey,
                                fullParentIssue.title,
                                "Bottleneck Alert",
                                `Your task is currently blocked because the sub-task <strong>${blockerKey}</strong> (assigned to ${blockerAssignee}) has been stagnant for too long. Please coordinate with them to resolve this bottleneck.`,
                                taskLink
                            ).catch((err) => console.error(`[Mailer] Failed to send bottleneck email for ${fullParentIssue.issueKey}:`, err.message));
                        }
                    }
                }
            }
        }
    }
};

module.exports = { checkWaitTimeBottleneck };
