const Issue = require("../models/issue");
const mongoose = require("mongoose");

class IssueDAO {
    async createIssue(issueData) {
        const newIssue = new Issue(issueData);
        return await newIssue.save();
    }

    async getIssues(filter) {
        return await Issue.find(filter)
            .populate('reporterId', 'username fullName email')
            .populate('assigneeId', 'username fullName email')
            .populate('attachments.uploadedBy', 'username fullName email')
            .populate('projectId', 'name')
            .populate('parentId', 'issueKey title')
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
            .populate('assigneeId', 'username fullName email')
            .populate('attachments.uploadedBy', 'username fullName email');
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

    async countIssuesByStatus(projectId, status) {
        return await Issue.countDocuments({ projectId, status });
    }

    async countIssuesByType(projectId, type) {
        return await Issue.countDocuments({ projectId, type });
    }


    async countIssuesBySprint(sprintId) {
        return await Issue.countDocuments({ sprintId });
    };

    async getUnresolvedIssuesBySprint(sprintId) {
        return await Issue.find({ sprintId, resolution: { $ne: 'Done' } });
    };

    async getDueIssues(startOfDay, endOfDay, projectId = null) {
        const queryFilter = {
            dueDate: { $gte: startOfDay, $lte: endOfDay },
            resolution: { $ne: 'Done' },
            assigneeId: { $ne: null },
            parentId: null
        };

        if (projectId) {
            queryFilter.projectId = projectId;
        }

        return await Issue.find(queryFilter).populate('assigneeId');
    }


    async getMemberWorkloads(projectId) {
        return await Issue.aggregate([
            {
                $match: {
                    projectId: new mongoose.Types.ObjectId(projectId),
                    resolution: 'Unresolved',
                    assigneeId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$assigneeId',
                    activeTasksCount: { $sum: 1 },
                    totalPoints: { $sum: '$storyPoints' }
                }
            }
        ]);
    }
}

module.exports = new IssueDAO();