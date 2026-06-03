const {
    createProjectService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectService,
    deleteProjectService,
    addMemberService,
    respondToInvitationService,
    removeMemberService,
    getProjectMembersService,
    updateBoardColumnsService,
    updateIssueTypesService,
    getBoardColumnsService,
    getIssueTypesService,
    deleteBoardColumnService,
    deleteIssueTypeService,
    createSmartProjectService
} = require("../services/projectService");
const { generateProjectSuggestion } = require("../services/aiService");
const { rescheduleProjectCrons } = require('../services/cronService');
const { StatusCodes } = require("http-status-codes");

const createProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const projectData = req.body;

        const project = await createProjectService(projectData, userId);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Project created successfully",
            data: project
        });
    } catch (error) {
        next(error);
    }
};

const getAllProjects = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const result = await getAllProjectsService(req.query, userId, userRole);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const project = await getProjectByIdService(projectId, userId, userRole);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: project
        });
    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;
        const updateData = req.body;

        const project = await updateProjectService(projectId, updateData, userId, userRole);

        const io = req.app.get('io');
        if (io && project) {
            rescheduleProjectCrons(project, io);
        }

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Project updated successfully",
            data: project
        });
    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const result = await deleteProjectService(projectId, userId, userRole);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

const addMember = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const inviterId = req.user._id;
        const { email, role } = req.body;

        if (!email) throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required.");

        const result = await addMemberService(projectId, inviterId, email, role);

        res.status(StatusCodes.OK).json({ EC: 0, EM: result.message });
    } catch (error) { next(error); }
};

const respondToInvitation = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) throw new ApiError(StatusCodes.BAD_REQUEST, "Token is missing.");

        const currentUserId = req.user._id;
        const result = await respondToInvitationService(token, currentUserId);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message || "Success",
            data: result.members || null
        });
    } catch (error) { next(error); }
};

const removeMember = async (req, res, next) => {
    try {
        const { projectId, accountId } = req.params;
        const requesterId = req.user._id;

        const result = await removeMemberService(projectId, requesterId, accountId);

        res.status(StatusCodes.OK).json({ EC: 0, EM: result.message });
    } catch (error) { next(error); }
};

const getProjectMembers = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        const members = await getProjectMembersService(projectId, userId);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: members
        });
    } catch (error) {
        next(error);
    }
};

const updateBoardColumns = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { _id: userId } = req.user;
        const { boardColumns } = req.body; // Body chỉ chứa mảng boardColumns

        const updatedColumns = await updateBoardColumnsService(projectId, userId, boardColumns);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Board columns updated successfully.",
            data: updatedColumns
        });
    } catch (error) {
        next(error);
    }
};

const deleteBoardColumn = async (req, res, next) => {
    try {
        const { projectId, columnName } = req.params;
        const { targetColumnName } = req.body;
        const userId = req.user._id;

        const result = await deleteBoardColumnService(projectId, userId, columnName, targetColumnName);
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: result.data
        });
    } catch (error) {
        next(error);
    }
};

const updateIssueTypes = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { _id: userId } = req.user;
        const { issueTypes } = req.body; // Body chỉ chứa mảng issueTypes

        const updatedTypes = await updateIssueTypesService(projectId, userId, issueTypes);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Issue types updated successfully.",
            data: updatedTypes
        });
    } catch (error) {
        next(error);
    }
};

const deleteIssueType = async (req, res, next) => {
    try {
        const { projectId, typeName } = req.params;
        const userId = req.user._id;
        const { targetTypeName } = req.body;

        const result = await deleteIssueTypeService(projectId, userId, typeName, targetTypeName);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: result.data
        });
    } catch (error) {
        next(error);
    }
};

const getBoardColumns = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const boardColumns = await getBoardColumnsService(projectId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: boardColumns });
    } catch (error) {
        next(error);
    }
};

const getIssueTypes = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const issueTypes = await getIssueTypesService(projectId, userId);
        return res.status(StatusCodes.OK).json({ EC: 0, EM: "Success", data: issueTypes });
    } catch (error) {
        next(error);
    }
};

// AI Smart Project — Bước 1: Sinh suggestion và tạo luôn dự án nháp
const createSmartProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ EC: 1, EM: "Missing prompt data." });
        }

        // Sinh cấu trúc từ AI
        const suggestion = await generateProjectSuggestion(prompt);

        // Tạo project và truyền tham số isDraft = true
        const result = await createSmartProjectService(suggestion, userId, true);

        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Smart project draft created successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const confirmSmartProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Chỉ cần gọi updateProjectService để set isAiDraft = false
        const project = await updateProjectService(projectId, { isAiDraft: false }, userId, userRole);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Smart project confirmed successfully",
            data: project
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    respondToInvitation,
    removeMember,
    getProjectMembers,
    updateBoardColumns,
    updateIssueTypes,
    getBoardColumns,
    getIssueTypes,
    deleteBoardColumn,
    deleteIssueType,
    createSmartProject,
    confirmSmartProject
};