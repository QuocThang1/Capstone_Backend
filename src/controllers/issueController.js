const { createIssueService,
    getIssuesBySprintService,
    getIssuesByProjectService,
    getMyIssuesByProjectService,
    getMyIssuesService,
    updateIssueService,
    deleteIssueService,
    createSubtaskService,
    getSubtasksService,
    uploadAttachmentService,
    deleteAttachmentService
} = require("../services/issueService");
const { suggestAssigneesForIssue } = require("../services/aiService");
const { StatusCodes } = require("http-status-codes");

const createIssue = async (req, res, next) => {
    try {
        const creatorId = req.user._id;
        const issueData = req.body;

        const issue = await createIssueService(issueData, creatorId);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Issue created successfully",
            data: issue
        });
    } catch (error) {
        next(error);
    }
};

const getIssuesBySprint = async (req, res, next) => {
    try {
        const { sprintId } = req.params;
        const userId = req.user._id;
        const issues = await getIssuesBySprintService(sprintId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

const getIssuesByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        const filters = {
            type: req.query.type,
            priority: req.query.priority,
            assigneeId: req.query.assignee,
            sprintId: req.query.sprint,
            status: req.query.status,
            title: req.query.title
        };

        const issues = await getIssuesByProjectService(projectId, userId, filters);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

const getMyIssuesByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        const filters = {
            type: req.query.type,
            sprintId: req.query.sprint
        };

        const issues = await getMyIssuesByProjectService(projectId, userId, filters);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

const getMyIssues = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const filters = {
            type: req.query.type,
            sprintId: req.query.sprint,
            projectId: req.query.project
        };

        const issues = await getMyIssuesService(userId, filters);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issues });
    } catch (error) {
        next(error);
    }
};

const updateIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const updateData = req.body;
        const userId = req.user._id;

        const io = req.app.get('io');

        const updatedIssue = await updateIssueService(issueId, updateData, userId, io);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Issue updated successfully",
            data: updatedIssue
        });
    } catch (error) {
        next(error);
    }
};

const deleteIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const userId = req.user._id;

        const result = await deleteIssueService(issueId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

const createSubtask = async (req, res, next) => {
    try {
        const creatorId = req.user._id;
        const subtaskData = req.body;

        const subtask = await createSubtaskService(subtaskData, creatorId);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Sub-task created successfully",
            data: subtask
        });
    } catch (error) {
        next(error);
    }
};

const getSubtasks = async (req, res, next) => {
    try {
        const { issueId: parentId } = req.params; // Lấy issueId từ URL và đổi tên thành parentId
        const userId = req.user._id;

        const subtasks = await getSubtasksService(parentId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Sub-tasks fetched successfully",
            data: subtasks
        });
    } catch (error) {
        next(error);
    }
};

const suggestAssignees = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const userId = req.user._id;

        const suggestions = await suggestAssigneesForIssue(issueId, userId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "AI generated suggestions successfully",
            data: suggestions
        });
    } catch (error) {
        next(error);
    }
};

const uploadAttachment = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const userId = req.user._id;
        const file = req.file;

        if (!file) throw new ApiError(StatusCodes.BAD_REQUEST, "No file uploaded");

        const io = req.app.get('io');
        const attachments = await uploadAttachmentService(issueId, userId, file, io);

        res.status(StatusCodes.OK).json({ EC: 0, EM: "Uploaded successfully", data: attachments });
    } catch (error) {
        next(error);
    }
};

const deleteAttachment = async (req, res, next) => {
    try {
        const { issueId, attachmentId } = req.params;
        const userId = req.user._id;

        const io = req.app.get('io');
        const attachments = await deleteAttachmentService(issueId, attachmentId, userId, io);

        res.status(StatusCodes.OK).json({ EC: 0, EM: "Deleted successfully", data: attachments });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createIssue,
    getIssuesBySprint,
    getIssuesByProject,
    getMyIssuesByProject,
    getMyIssues,
    updateIssue,
    deleteIssue,
    createSubtask,
    getSubtasks,
    suggestAssignees,
    uploadAttachment,
    deleteAttachment
};