const Project = require("../models/project");

class ProjectDAO {
    async createProject(projectData) {
        const newProject = new Project(projectData);
        return await newProject.save();
    }

    async getAllProjects(filter = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const projects = await Project.find(filter)
            .populate('members.accountId', 'username fullName email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Project.countDocuments(filter);

        return {
            projects,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getProjectById(projectId) {
        return await Project.findById(projectId)
            .populate('members.accountId', 'username fullName email');
    }

    async getProjectByKey(key) {
        return await Project.findOne({ key: key.toUpperCase() })
            .populate('members.accountId', 'username fullName email');
    }

    async updateProject(projectId, updateData) {
        return await Project.findByIdAndUpdate(
            projectId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('members.accountId', 'username fullName email');
    }

    async deleteProject(projectId) {
        return await Project.findByIdAndDelete(projectId);
    }

    async getProjectsByMember(accountId) {
        return await Project.find({
            'members.accountId': accountId
        }).populate('members.accountId', 'username fullName email');
    }

    async checkMemberExists(projectId, accountId) {
        return await Project.findOne({
            _id: projectId,
            'members.accountId': accountId
        });
    }

    async incrementIssueSequence(projectId) {
        return await Project.findByIdAndUpdate(
            projectId,
            { $inc: { issueSequence: 1 } },
            { new: true }
        );
    }
}

module.exports = new ProjectDAO();