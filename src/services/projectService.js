const projectDAO = require("../DAO/projectDAO");
const sprintDAO = require("../DAO/sprintDAO");
const accountDAO = require("../DAO/accountDAO");
const issueDAO = require("../DAO/issueDAO");
const historyDAO = require("../DAO/historyDAO");
const commentDAO = require("../DAO/commentDAO");
const workflowDAO = require("../DAO/workflowDAO");
const jwt = require("jsonwebtoken");
const { sendInvitationEmail } = require("../utils/mailer");
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

    //test quyền admin để xem tất cả project, nếu không phải admin thì chỉ xem project có mình là member
    // if (userRole !== 'admin') {
    filter['members.accountId'] = userId;
    // }

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

    const finalUpdateData = {
        name: updateData.name,
        key: updateData.key,
        description: updateData.description,
        boardColumns: updateData.boardColumns,
        issueTypes: updateData.issueTypes,
    };

    if (updateData.hasOwnProperty('notifHour')) {
        const h = updateData.notifHour || 0;
        const m = updateData.notifMinute || 0;
        finalUpdateData.notificationCron = `${m} ${h} * * *`; // Chạy mỗi ngày lúc H giờ M phút
    }

    if (updateData.hasOwnProperty('bottleType') && updateData.hasOwnProperty('bottleValue')) {
        const type = updateData.bottleType;
        const value = parseInt(updateData.bottleValue, 10);

        if (type === 'hourly') {
            finalUpdateData.bottleneckCron = `0 */${value} * * *`; // Quét mỗi "N" số giờ
        } else if (type === 'minutes') {
            finalUpdateData.bottleneckCron = `*/${value} * * * *`; // Quét mỗi "N" số phút
        }
    }

    if (updateData.hasOwnProperty('isNotificationActive')) {
        finalUpdateData.isNotificationActive = updateData.isNotificationActive;
    }
    if (updateData.hasOwnProperty('isBottleneckActive')) {
        finalUpdateData.isBottleneckActive = updateData.isBottleneckActive;
    }

    Object.keys(finalUpdateData).forEach(key => {
        if (finalUpdateData[key] === undefined) {
            delete finalUpdateData[key];
        }
    });

    const updatedProject = await projectDAO.updateProject(projectId, finalUpdateData);
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

    // Lấy danh sách ID của tất cả issue trong project
    const issuesInProject = await issueDAO.getIssues({ projectId });
    const issueIds = issuesInProject.map(issue => issue._id);

    // Xóa tất cả các dữ liệu liên quan
    if (issueIds.length > 0) {
        await commentDAO.deleteManyComments({ issueId: { $in: issueIds } });
        await historyDAO.deleteManyHistories({ issueId: { $in: issueIds } }); // <-- THÊM DÒNG NÀY
    }

    await issueDAO.deleteManyIssues({ projectId });
    await sprintDAO.deleteManySprints({ projectId });
    await workflowDAO.deleteManyWorkflows({ projectId });
    await projectDAO.deleteProject(projectId);

    return { message: "Project deleted successfully" };
};

const addMemberService = async (projectId, inviterId, memberEmail, role = 'member') => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");

    // Nhờ populate lúc lấy project, ta lấy được tên người mời trực tiếp
    const inviter = project.members.find(m => m.accountId._id.toString() === inviterId.toString());
    if (!inviter || inviter.role !== 'leader') throw new ApiError(StatusCodes.FORBIDDEN, "Only the project leader can invite members.");

    if (project.members.length >= 5) throw new ApiError(StatusCodes.BAD_REQUEST, "Project member limit (5) reached.");

    const accountToAdd = await accountDAO.findByEmail(memberEmail);
    if (!accountToAdd) throw new ApiError(StatusCodes.BAD_REQUEST, "User with this email not found on the system.");

    const isAlreadyMember = project.members.some(m => m.accountId._id.toString() === accountToAdd._id.toString());
    if (isAlreadyMember) throw new ApiError(StatusCodes.BAD_REQUEST, "User is already a member of this project.");

    // Tạo JWT Token mời
    const token = jwt.sign(
        { projectId, accountId: accountToAdd._id, role },
        process.env.JWT_SECRET,
        { expiresIn: '3d' }
    );

    // Xây dựng link Frontend. Bạn hãy đảm bảo thêm FRONTEND_URL vào file .env
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const acceptLink = `${frontendUrl}/project/invite?token=${token}`;

    const inviterName = inviter.accountId.fullName || inviter.accountId.username;

    // Tiến hành nổ Mail bất đồng bộ
    await sendInvitationEmail(memberEmail, inviterName, project.name, acceptLink);

    return { message: "Invitation email sent successfully." };
};

// THÊM: Service đồng ý tham gia khi Frontend gửi token lên
const respondToInvitationService = async (token, currentUserId) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { projectId, accountId, role } = decoded;

        if (!currentUserId || currentUserId.toString() !== accountId.toString()) {
            throw new ApiError(
                StatusCodes.FORBIDDEN,
                "This invitation does not belong to the currently signed-in account."
            );
        }

        const project = await projectDAO.getProjectById(projectId);
        if (!project) throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");

        const isAlreadyMember = project.members.some(m => m.accountId._id.toString() === accountId.toString());
        if (isAlreadyMember) throw new ApiError(StatusCodes.BAD_REQUEST, "You are already a member of this project.");

        if (project.members.length >= 5) throw new ApiError(StatusCodes.BAD_REQUEST, "Project is full (Limit 5).");


        const updatedProject = await projectDAO.addMember(projectId, accountId, role);
        return updatedProject;
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }

        if (err.name === "TokenExpiredError") {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invitation token has expired.");
        }

        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid token.");
        }

        throw err;
    }
};

// THÊM: Service tự đá thành viên
const removeMemberService = async (projectId, requesterId, memberIdToRemove) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");

    const requester = project.members.find(m => m.accountId._id.toString() === requesterId.toString());
    if (!requester || requester.role !== 'leader') throw new ApiError(StatusCodes.FORBIDDEN, "Only the project leader can remove members.");

    if (requesterId.toString() === memberIdToRemove.toString()) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot remove yourself.");
    }

    const isMember = project.members.some(m => m.accountId._id.toString() === memberIdToRemove.toString());
    if (!isMember) throw new ApiError(StatusCodes.NOT_FOUND, "User is not a member of this project.");

    // Rút quyền
    await projectDAO.removeMember(projectId, memberIdToRemove);

    // Hủy bỏ việc giao task hiện tại. Những task đã giao cho người này sẽ trả về Unassigned (null)
    await issueDAO.updateManyIssues(
        { projectId, assigneeId: memberIdToRemove },
        { update: { $set: { assigneeId: null } } } // Mongoose update
    );

    return { message: "Member removed successfully." };
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

    const statusUpdateTasks = [];
    boardColumns.forEach(newColumn => {
        // Chỉ xử lý các cột đã tồn tại (có _id)
        if (newColumn._id) {
            const originalColumn = project.boardColumns.find(
                oldCol => oldCol._id.toString() === newColumn._id.toString()
            );

            // Nếu tìm thấy cột cũ và tên đã thay đổi
            if (originalColumn && originalColumn.name !== newColumn.name) {
                statusUpdateTasks.push(
                    issueDAO.updateManyIssues(
                        { projectId, status: originalColumn.name },
                        { $set: { status: newColumn.name } }
                    )
                );
            }
        }
    });

    if (statusUpdateTasks.length > 0) {
        await Promise.all(statusUpdateTasks);
    }

    return updatedProject.boardColumns;
};

const deleteBoardColumnService = async (projectId, userId, columnName, targetColumnName) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền: chỉ member mới được xóa
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project members can delete columns.");
    }

    // Không cho phép xóa cột "Done"
    if (columnName === "Done") {
        throw new ApiError(StatusCodes.FORBIDDEN, "The 'Done' column cannot be deleted.");
    }

    const columnToDelete = project.boardColumns.find(col => col.name === columnName);
    if (!columnToDelete) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Column "${columnName}" not found.`);
    }

    // Đếm số lượng issue trong cột này
    const issueCount = await issueDAO.countIssuesByStatus(projectId, columnName);

    if (issueCount > 0) {
        // Nếu có issue, kiểm tra xem người dùng đã cung cấp cột đích chưa
        if (!targetColumnName) {
            // Giai đoạn 1: Yêu cầu người dùng chọn cột đích
            const availableColumns = project.boardColumns
                .filter(col => col.name !== columnName)
                .map(col => col.name);

            throw new ApiError(StatusCodes.BAD_REQUEST, `There are ${issueCount} issues in the "${columnName}" column. Please specify a target column to move these issues to before deletion.`).withContext({ availableColumns, requiresMigration: true });
        }

        // Giai đoạn 2: Người dùng đã cung cấp cột đích, tiến hành di chuyển và xóa
        const targetColumn = project.boardColumns.find(col => col.name === targetColumnName);
        if (!targetColumn) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Target column "${targetColumnName}" is not valid.`);
        }

        // Di chuyển các issue
        await issueDAO.updateManyIssues(
            { projectId, status: columnName },
            { $set: { status: targetColumnName } }
        );
    }

    // Cập nhật tất cả các workflow trong project để loại bỏ các transition liên quan đến cột bị xóa
    const workflows = await workflowDAO.getWorkflowsByProjectId(projectId);
    const updateWorkflowTasks = workflows.map(workflow => {
        // Lọc bỏ các rule có 'from' là cột bị xóa
        const filteredTransitions = workflow.transitions.filter(t => t.from !== columnName);

        // Với các rule còn lại, lọc bỏ cột bị xóa khỏi mảng 'to'
        const updatedTransitions = filteredTransitions.map(t => {
            t.to = t.to.filter(toStatus => toStatus !== columnName);
            return t;
        });

        return workflowDAO.updateWorkflow(workflow._id, { transitions: updatedTransitions });
    });

    await Promise.all(updateWorkflowTasks);


    // Xóa cột khỏi mảng boardColumns
    const updatedColumns = project.boardColumns.filter(col => col.name !== columnName);
    const updatedProject = await projectDAO.updateProject(projectId, { boardColumns: updatedColumns });

    return {
        data: updatedProject.boardColumns,
        message: `Column "${columnName}" deleted successfully.`
    };
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

const deleteIssueTypeService = async (projectId, userId, typeName, targetTypeName) => {
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found");
    }

    // Kiểm tra quyền: chỉ member/leader mới được xóa (hoặc set strict hơn tùy bạn)
    const isMember = project.members.some(m => m.accountId._id.toString() === userId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only project members can delete issue types.");
    }

    // Không cho phép xóa cụm "Task" mặc định (bắt buộc phải có)
    if (typeName === "Task") {
        throw new ApiError(StatusCodes.FORBIDDEN, "The 'Task' issue type cannot be deleted.");
    }

    const typeToDelete = project.issueTypes.find(t => t.name === typeName);
    if (!typeToDelete) {
        throw new ApiError(StatusCodes.NOT_FOUND, `Issue type "${typeName}" not found.`);
    }

    // Đếm số lượng issue thuộc type cần xóa
    const issueCount = await issueDAO.countIssuesByType(projectId, typeName);

    if (issueCount > 0) {
        // Nếu có issue, kiểm tra xem người dùng đã cung cấp Target Type chưa
        if (!targetTypeName) {
            // Yêu cầu người dùng chọn Type đích (Loại bỏ type hiện tại ra khỏi danh sách)
            const availableTypes = project.issueTypes
                .filter(t => t.name !== typeName)
                .map(t => t.name);

            throw new ApiError(StatusCodes.BAD_REQUEST, `There are ${issueCount} issues with type "${typeName}". Please specify a target issue type to move them to before deletion.`)
                .withContext({ availableTypes, requiresMigration: true });
        }

        // Người dùng đã chọn type đích, tiến hành cập nhật
        const targetType = project.issueTypes.find(t => t.name === targetTypeName);
        if (!targetType) {
            throw new ApiError(StatusCodes.BAD_REQUEST, `Target issue type "${targetTypeName}" is not valid.`);
        }

        // Đẩy toàn bộ Issue qua type mới
        await issueDAO.updateManyIssues(
            { projectId, type: typeName },
            { $set: { type: targetTypeName } }
        );
    }

    // Xóa field khỏi mảng issueTypes của project
    const updatedTypes = project.issueTypes.filter(t => t.name !== typeName);
    const updatedProject = await projectDAO.updateProject(projectId, { issueTypes: updatedTypes });

    return {
        data: updatedProject.issueTypes,
        message: `Issue type "${typeName}" deleted successfully.`
    };
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
    respondToInvitationService,
    removeMemberService,
    getProjectMembersService,
    updateBoardColumnsService,
    updateIssueTypesService,
    getBoardColumnsService,
    getIssueTypesService,
    deleteBoardColumnService,
    deleteIssueTypeService
};