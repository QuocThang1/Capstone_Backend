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

    async getIssueById(issueId) {
        return await Issue.findById(issueId);
    }

    async updateIssue(issueId, updateData) {
        return await Issue.findByIdAndUpdate(
            issueId,
            { $set: updateData },
            { new: true }
        )
            .populate('reporterId', 'username fullName email')
            .populate('assigneeId', 'username fullName email');
    }

    async deleteIssue(issueId) {
        return await Issue.findByIdAndDelete(issueId);
    }

    // Hàm này dùng để xóa các sub-task khi task cha bị xóa
    async deleteManyIssues(filter) {
        return await Issue.deleteMany(filter);
    }

    async updateManyIssues(filter, update) {
        return await Issue.updateMany(filter, update);
    }

    async getSubtasks(parentId) {
        return await this.getIssues({ parentId: parentId });
    }
}

module.exports = new IssueDAO();