const {
    createProjectService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectService,
    deleteProjectService,
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

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
};