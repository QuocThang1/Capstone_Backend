const projectDAO = require("../DAO/projectDAO");
const sprintDAO = require("../DAO/sprintDAO");
const accountDAO = require("../DAO/accountDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");
const { get } = require("mongoose");

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

    if (newProject) {
        await sprintDAO.createSprint({
            projectId: newProject._id,
            name: "Backlog",
        });
    }

    return newProject;
};

const getAllProjectsService = async (query, userId, userRole) => {
    const { page = 1, limit = 5, search } = query;

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

const addMemberService = async (projectId, inviterId, memberEmail, role = 'member') => {
    //Lấy thông tin project và kiểm tra quyền của người mời
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");
    }

    const inviter = project.members.find(m => m.accountId._id.toString() === inviterId.toString());
    //Chỉ leader mới có quyền mời thành viên mới
    if (!inviter || inviter.role !== 'leader') {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project leaders can add new members.");
    }

    // Kiểm tra số lượng thành viên hiện tại
    if (project.members.length >= 5) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "The project has reached the maximum number of 5 members.");
    }

    //Tìm tài khoản được mời bằng email
    const accountToAdd = await accountDAO.findByEmail(memberEmail);
    if (!accountToAdd) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Account with email "${memberEmail}" not found.`);
    }

    const isAlreadyMember = project.members.some(m => m.accountId._id.toString() === accountToAdd._id.toString());
    if (isAlreadyMember) {
        throw new ApiError(StatusCodes.CONFLICT, `This user is already a member of the project.`);
    }

    //Thêm thành viên vào project
    const updatedProject = await projectDAO.addMember(projectId, accountToAdd._id, role);
    return updatedProject;
};

const getProjectMembersService = async (projectId, userId) => {
    //Lấy thông tin project
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");
    }

    // Kiểm tra xem người dùng có phải là thành viên của project không
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");
    }

    //Trả về danh sách thành viên
    return project.members;
};

const updateBoardColumnsService = async (projectId, userId, boardColumns) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project members or admin can update board columns.");
    }

    if (!Array.isArray(boardColumns)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Board columns data must be an array.");
    }

    const originalDoneColumn = project.boardColumns.find(col => col.name === "Done");

    if (originalDoneColumn) {
        // Tìm xem cột "Done" có trong dữ liệu mới gửi lên không
        const newDoneColumn = boardColumns.find(col => col._id.toString() === originalDoneColumn._id.toString());

        if (!newDoneColumn) {
            throw new ApiError(StatusCodes.FORBIDDEN, `The "Done" column cannot be deleted.`);
        }
        if (newDoneColumn.name !== "Done") {
            throw new ApiError(StatusCodes.FORBIDDEN, `The "Done" column cannot be renamed.`);
        }
    }

    // Tạo một Set chứa tên các cột. Nếu kích thước Set nhỏ hơn độ dài mảng, nghĩa là có trùng lặp.
    if (new Set(boardColumns.map(col => col.name)).size < boardColumns.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Board column names must be unique.");
    }

    const updatedProject = await projectDAO.updateProject(projectId, { boardColumns });
    return updatedProject.boardColumns;
};

const updateIssueTypesService = async (projectId, userId, issueTypes) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }


    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project members or admin can update issue types.");
    }

    if (!Array.isArray(issueTypes)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Issue types data must be an array.");
    }

    // Logic tương tự cho issue types
    if (new Set(issueTypes.map(type => type.name)).size < issueTypes.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Issue type names must be unique.");
    }

    const updatedProject = await projectDAO.updateProject(projectId, { issueTypes });
    return updatedProject.issueTypes;
};

const getBoardColumnsService = async (projectId, userId) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền truy cập
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project");
    }

    // Sắp xếp các cột theo thứ tự 'order' trước khi trả về
    return project.boardColumns.sort((a, b) => a.order - b.order);
};

const getIssueTypesService = async (projectId, userId) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền truy cập
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project");
    }

    return project.issueTypes;
};

module.exports = {
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
};