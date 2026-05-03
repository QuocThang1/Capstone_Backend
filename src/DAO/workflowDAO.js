const Workflow = require("../models/workflow");

class WorkflowDAO {
    async createWorkflow(workflowData) {
        const workflow = new Workflow(workflowData);
        return await workflow.save();
    }

    async getWorkflowsByProjectId(projectId) {
        return await Workflow.find({ projectId });
    }

    async getWorkflowById(workflowId) {
        return await Workflow.findById(workflowId);
    }

    async findWorkflowByName(projectId, name) {
        return await Workflow.findOne({ projectId, name });
    }

    async updateWorkflow(workflowId, updateData) {
        return await Workflow.findByIdAndUpdate(workflowId, updateData, { new: true });
    }

    async deleteWorkflow(workflowId) {
        return await Workflow.findByIdAndDelete(workflowId);
    }

    async deleteManyWorkflows(filter) {
        return await Workflow.deleteMany(filter);
    }
}

module.exports = new WorkflowDAO();