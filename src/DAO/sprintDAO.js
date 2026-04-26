const Sprint = require("../models/sprint");

class SprintDAO {
    async createSprint(sprintData) {
        const newSprint = new Sprint(sprintData);
        return await newSprint.save();
    }

    async getSprintsByProjectId(projectId) {
        return await Sprint.find({ projectId }).sort({ createdAt: 'asc' });
    }

    async findSprintByName(projectId, name) {
        // Tìm sprint có tên trùng (không phân biệt hoa thường) trong cùng một project
        return await Sprint.findOne({
            projectId,
            name: { $regex: `^${name}$`, $options: 'i' }
        });
    }

    async getSprintById(sprintId) {
        return await Sprint.findById(sprintId);
    }

    async findOverlappingSprints(projectId, startDate, endDate, excludeSprintId = null) {
        const query = {
            projectId: projectId,
            ...(excludeSprintId && { _id: { $ne: excludeSprintId } }),

            startDate: { $ne: null },
            endDate: { $ne: null },

            // (startA <= endB) và (startB <= endA)
            $and: [
                { startDate: { $lte: endDate } },
                { endDate: { $gte: startDate } }
            ]
        };
        return await Sprint.find(query);
    }

    async updateSprint(sprintId, updateData) {
        return await Sprint.findByIdAndUpdate(
            sprintId,
            { $set: updateData },
            { new: true, runValidators: true }
        );
    }

    async deleteSprint(sprintId) {
        return await Sprint.findByIdAndDelete(sprintId);
    }

    async deleteManySprints(filter) {
        return await Sprint.deleteMany(filter);
    }
}

module.exports = new SprintDAO();