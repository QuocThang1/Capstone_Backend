const Issue = require("../models/issue");

class IssueDAO {
    async createIssue(issueData) {
        const newIssue = new Issue(issueData);
        return await newIssue.save();
    }

    async getIssues(filter) {
        return await Issue.find(filter)
            .populate('reporterId', 'username fullName email')
            .populate('assigneeId', 'username fullName email')
            .sort({ createdAt: -1 });
    }
}

module.exports = new IssueDAO();