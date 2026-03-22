const projectDAO = require("../DAO/projectDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const createProjectService = async (projectData, creatorId) => {
    const { name, key, description, boardColumns, issueTypes } = projectData;

    // Kiểm tra trùng tên project của chính user đó
    const existingProject = await projectDAO.findProjectByNameForUser(name, creatorId);
    if (existingProject) {
        throw new ApiError(StatusCodes.CONFLICT, "You already have a project with this name");
    }

    // Validate key format (chỉ chứa chữ cái và số, 2-10 ký tự)
    const keyRegex = /^[A-Z0-9]{2,10}$/;
    if (!keyRegex.test(key.toUpperCase())) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Project key must be 2-10 uppercase letters or numbers");
    }

    // Default board columns nếu không có
    const defaultBoardColumns = boardColumns && boardColumns.length > 0 ? boardColumns : [
        { name: "To Do", order: 1 },
        { name: "In Progress", order: 2 },
        { name: "Done", order: 3 }
    ];

    // Default issue types nếu không có
    const defaultIssueTypes = issueTypes && issueTypes.length > 0 ? issueTypes : [
        { name: "Task", description: "A task that needs to be done" },
        { name: "Bug", description: "A problem which needs to be resolved" },
        { name: "Story", description: "A user story" }
    ];

    const newProjectData = {
        name,
        key: key.toUpperCase(),
        description,
        boardColumns: defaultBoardColumns,
        issueTypes: defaultIssueTypes,
        members: [
            {
                accountId: creatorId,
                role: "leader"
            }
        ],
        issueSequence: 0
    };

    const newProject = await projectDAO.createProject(newProjectData);
    return newProject;
};

const getAllProjectsService = async (query, userId, userRole) => {
    const { page = 1, limit = 10, search } = query;

    const filter = {};

    // Nếu không phải admin, chỉ lấy project mà user là thành viên
    if (userRole !== 'admin') {
        filter['members.accountId'] = userId;
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { key: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const result = await projectDAO.getAllProjects(filter, parseInt(page), parseInt(limit));
    return result;
};

const getProjectByIdService = async (projectId, userId, userRole) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền truy cập: phải là member hoặc admin
    if (userRole !== 'admin') {
        const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
        if (!isMember) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project");
        }
    }

    return project;
};

const updateProjectService = async (projectId, updateData, userId, userRole) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền: phải là member hoặc admin
    if (userRole !== 'admin') {
        const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
        if (!isMember) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Only project members or admin can update project");
        }
    }

    // Nếu update name, kiểm tra trùng tên trong các project của user
    if (updateData.name && updateData.name !== project.name) {
        const existingProject = await projectDAO.findProjectByNameForUser(updateData.name, userId);
        // Phải đảm bảo project tìm thấy không phải là chính project đang update
        if (existingProject && existingProject._id.toString() !== projectId) {
            throw new ApiError(StatusCodes.CONFLICT, "You already have a project with this name");
        }
    }

    // Nếu update key, chỉ validate format, không check trùng
    if (updateData.key) {
        const keyRegex = /^[A-Z0-9]{2,10}$/;
        if (!keyRegex.test(updateData.key.toUpperCase())) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Project key must be 2-10 uppercase letters or numbers");
        }
        updateData.key = updateData.key.toUpperCase();
    }

    const updatedProject = await projectDAO.updateProject(projectId, updateData);
    return updatedProject;
};

const deleteProjectService = async (projectId, userId, userRole) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Chỉ admin hoặc member mới được xóa
    if (userRole !== 'admin') {
        const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
        if (!isMember) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Only project members or admin can delete project");
        }
    }

    await projectDAO.deleteProject(projectId);
    return { message: "Project deleted successfully" };
};

const getMyProjectsService = async (userId) => {
    const projects = await projectDAO.getProjectsByMember(userId);
    return projects;
};

module.exports = {
    createProjectService,
    getAllProjectsService,
    getProjectByIdService,
    updateProjectService,
    deleteProjectService,
    getMyProjectsService,
};