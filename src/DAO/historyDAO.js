const History = require("../models/history");
const Issue = require("../models/issue");

class HistoryDAO {
    async createHistory(historyData) {
        const newHistory = new History(historyData);
        return await newHistory.save();
    }

    async getHistoryByProjectId(projectId, filters = {}) {

        const issueFilter = { projectId };

        if (filters.sprintId) {
            issueFilter.sprintId = filters.sprintId;
        }

        const issues = await Issue.find(issueFilter).select('_id issueKey title');
        const issueIds = issues.map(issue => issue._id);

        if (issueIds.length === 0) {
            return [];
        }

        const historyFilter = { issueId: { $in: issueIds } };

        if (filters.days) {
            const timeLimit = new Date();
            timeLimit.setDate(timeLimit.getDate() - parseInt(filters.days, 10)); // Tính lùi ngày

            historyFilter.createdAt = { $gte: timeLimit };
        }

        return await History.find(historyFilter)
            .populate('authorId', 'username fullName email')
            .populate('issueId', 'issueKey title')
            .sort({ createdAt: -1 });
    }

    async getHistoryByIssueId(issueId) {
        return await History.find({ issueId })
            .populate('authorId', 'username fullName email')
            .sort({ createdAt: -1 });
    }

    async getHistoriesByIssueIds(issueIds) {
        return await History.find({ issueId: { $in: issueIds } })
            .populate('authorId', 'username fullName email')
            .sort({ createdAt: -1 });
    }

    async deleteManyHistories(filter) {
        return await History.deleteMany(filter);
    }
}

module.exports = new HistoryDAO();
