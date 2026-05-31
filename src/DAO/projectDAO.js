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
            .populate('members.accountId', 'username fullName email dob phone gender skills')
            .populate('activeWorkflowId');
    }

    async getProjectByKey(key) {
        return await Project.findOne({ key: key.toUpperCase() })
            .populate('members.accountId', 'username fullName email');
    }

    async findProjectByNameForUser(name, userId) {
        return await Project.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
            'members.accountId': userId
        });
    }

    async updateProject(projectId, updateData) {
        return await Project.findByIdAndUpdate(
            projectId,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).populate('members.accountId', 'username fullName email');
    }

    async deleteProject(projectId) {
        return await Project.findByIdAndDelete(projectId);
    }

    async getProjectsByMember(accountId) {
        return await Project.find({
            'members.accountId': accountId
        }).populate('members.accountId', 'username fullName email phone dob gender skills');
    }

    async isMemberOfProject(projectId, accountId) {
        const project = await Project.findOne({
            _id: projectId,
            'members.accountId': accountId
        });
        return !!project;
    }

    async checkMemberExists(projectId, accountId) {
        return await Project.findOne({
            _id: projectId,
            'members.accountId': accountId
        });
    }

    async addMember(projectId, accountId, role = 'member') {
        const newMember = { accountId, role };
        return await Project.findByIdAndUpdate(
            projectId,
            { $push: { members: newMember } },
            { returnDocument: 'after' }
        ).populate('members.accountId', 'username fullName email');
    }

    async removeMember(projectId, accountId) {
        return await Project.findByIdAndUpdate(
            projectId,
            { $pull: { members: { accountId: accountId } } },
            { new: true }
        ).populate('members.accountId', 'username fullName email');
    }

    async incrementIssueSequence(projectId) {
        return await Project.findByIdAndUpdate(
            projectId,
            { $inc: { issueSequence: 1 } },
            { returnDocument: 'after' }
        );
    }
}

module.exports = new ProjectDAO();
