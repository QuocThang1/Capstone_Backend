const issueDAO = require("../DAO/issueDAO");
const bottleneckDAO = require("../DAO/bottleneckDAO");
const historyDAO = require("../DAO/historyDAO");

const checkWaitTimeBottleneck = async (io, projectId) => {
    console.log("Checking Wait Time Bottleneck...");
    const now = new Date();

    const activeIssues = await issueDAO.getIssues({
        projectId: projectId,
        resolution: { $ne: 'Done' },
        startDate: { $lte: now, $ne: null },
        timeExpect: { $gt: 0 }
    });

    for (const issue of activeIssues) {
        const histories = await historyDAO.getHistoryByIssueId(issue._id);
        const hasStatusChanged = histories.some(h =>
            h.field === "Status" &&
            new Date(h.createdAt) >= new Date(issue.startDate)
        );

        if (!hasStatusChanged) {
            const hoursWaited = (now - new Date(issue.startDate)) / (1000 * 60 * 60);

            if (hoursWaited > (issue.timeExpect * 0.5)) {

                // 3. Ghi log Bottleneck bằng DAO (Cập nhật hoặc tạo mới)
                const bottleneckRecord = await bottleneckDAO.createOrUpdateBottleneck({
                    projectId: issue.projectId,
                    issueId: issue._id,
                    name: "Wait Time Exceeded",
                    content: `Task has not been started. Waited for ${hoursWaited.toFixed(1)} hours (exceeds 50% of timeExpect: ${issue.timeExpect} hrs).`,
                    level: issue.priority,
                    isResolved: false
                });

                // 4. Bắn Socket thông báo real-time
                if (io) {
                    // Gửi thông báo tới phòng của Project để Leader và các thành viên liên quan có thể thấy được
                    io.to(issue.projectId.toString()).emit('bottleneck_alert', bottleneckRecord);

                    // // Gửi trực tiếp thông báo hệ thống tới Assignee đang online
                    // if (issue.assigneeId) {
                    //     const assigneeIdStr = issue.assigneeId._id ? issue.assigneeId._id.toString() : issue.assigneeId.toString();
                    //     io.to(`user_${assigneeIdStr}`).emit('bottleneck_alert', bottleneckRecord);
                    // }
                }
            }
        }
    }
};

module.exports = { checkWaitTimeBottleneck };