const History = require("../models/history");

class HistoryDAO {
    async createHistory(historyData) {
        const newHistory = new History(historyData);
        return await newHistory.save();
    }

    async getHistoryByIssueId(issueId) {
        return await History.find({ issueId })
            .populate('authorId', 'username fullName email')
            .sort({ createdAt: -1 });
    }
}

module.exports = new HistoryDAO();