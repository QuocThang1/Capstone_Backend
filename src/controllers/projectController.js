const {
    createProjectService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectService,
    deleteProjectService,
    addMemberService,
    getProjectMembersService,
    updateBoardColumnsService,
    updateIssueTypesService,
    getBoardColumnsService,
    getIssueTypesService,
} = require("../services/projectService");
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
        const { email, role } = req.body; // Lấy email và role từ body

        if (!email) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required.");
        }

        const updatedProject = await addMemberService(projectId, inviterId, email, role);

        res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Member added successfully.",
            data: updatedProject.members // Trả về danh sách members mới
        });
    } catch (error) {
        next(error);
    }
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

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    getProjectMembers,
    updateBoardColumns,
    updateIssueTypes,
    getBoardColumns,
    getIssueTypes,
};