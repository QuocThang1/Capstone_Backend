const issueDAO = require("../DAO/issueDAO");
const projectDAO = require("../DAO/projectDAO");
const sprintDAO = require("../DAO/sprintDAO");
const commentDAO = require("../DAO/commentDAO");
const historyDAO = require("../DAO/historyDAO");
const mongoose = require("mongoose");
const { createHistoryRecord } = require("./historyService");
const { cloudinary } = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const calculateTimeExpect = (startDate, dueDate, storyPoints) => {
    if (!startDate || !dueDate || !storyPoints) return 0;
    const sDate = new Date(startDate);
    const dDate = new Date(dueDate);
    if (dDate <= sDate) return 0;

    // (Thời gian chênh lệch tính theo ms) / (1000 * 60 * 60) để ra số Giờ
    const diffHours = (dDate - sDate) / (1000 * 60 * 60);
    const timeExpect = diffHours * storyPoints;

    return parseFloat(timeExpect.toFixed(1));
};

const createIssueService = async (issueData, creatorId) => {
    const { projectId, sprintId, title, type, parentId } = issueData;

    //Kiểm tra sự tồn tại của Project và quyền của user
    const project = await projectDAO.getProjectById(projectId);
    if (!project) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Project not found.");
    }
    const isMember = project.members.some(m => m.accountId._id.toString() === creatorId.toString());
    if (!isMember) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You are not a member of this project.");
    }

    //Kiểm tra sự tồn tại của Sprint nếu có sprintId
    if (sprintId) {
        const sprint = await sprintDAO.getSprintById(sprintId);
        if (!sprint || sprint.projectId.toString() !== projectId.toString()) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found in this project.");
        }
    }

    //Lấy và tăng số thứ tự issue của project
    const updatedProject = await projectDAO.incrementIssueSequence(projectId);
    const issueSequence = updatedProject.issueSequence;

    //Tạo issueKey
    const issueKey = `${project.key}-${issueSequence}`;

    const newIssueData = {
        ...issueData,
        projectId,
        sprintId,
        parentId,
        issueKey,
        title,
        type,
        reporterId: creatorId,
        timeExpect: calculateTimeExpect(issueData.startDate, issueData.dueDate, issueData.storyPoints),
    };

    const newIssue = await issueDAO.createIssue(newIssueData);
    return newIssue;
};

const getIssuesBySprintService = async (sprintId, userId) => {
    const sprint = await sprintDAO.getSprintById(sprintId);
    if (!sprint) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Sprint not found.");
    }

    // Kiểm tra user có quyền truy cập project chứa sprint này không
    const project = await projectDAO.checkMemberExists(sprint.projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    const filter = { projectId: sprint.projectId, sprintId }

    return await issueDAO.getIssues(filter);
};

const getIssuesByProjectService = async (projectId, userId, filters = {}) => {
    // Kiểm tra user có quyền truy cập project không
    const project = await projectDAO.checkMemberExists(projectId, userId);
    if (!project) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }
    const queryFilter = { projectId };

    // Thêm các bộ lọc nếu từ frontend có truyền kèm
    if (filters.type) queryFilter.type = filters.type;
    if (filters.priority) queryFilter.priority = filters.priority;
    if (filters.assigneeId) queryFilter.assigneeId = filters.assigneeId;
    if (filters.sprintId) queryFilter.sprintId = filters.sprintId;
    if (filters.status) queryFilter.status = filters.status;
    if (filters.status) queryFilter.status = filters.status;

    // Tìm kiếm theo một phần của Title (không phân biệt hoa/thường)
    if (filters.title) {
        queryFilter.title = { $regex: filters.title, $options: "i" }; // "i" là case-insensitive
    }
    return await issueDAO.getIssues(queryFilter);
};
const updateIssueService = async (issueId, updateData, userId, io) => {

    const originalIssue = await issueDAO.getIssueById(issueId);
    if (!originalIssue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    const project = await projectDAO.getProjectById(originalIssue.projectId);

    const hasAccess = await projectDAO.isMemberOfProject(originalIssue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    if (updateData.hasOwnProperty('startDate') || updateData.hasOwnProperty('dueDate') || updateData.hasOwnProperty('storyPoints')) {
        const tempStartDate = updateData.hasOwnProperty('startDate') ? updateData.startDate : originalIssue.startDate;
        const tempDueDate = updateData.hasOwnProperty('dueDate') ? updateData.dueDate : originalIssue.dueDate;
        const tempStoryPoints = updateData.hasOwnProperty('storyPoints') ? updateData.storyPoints : originalIssue.storyPoints;

        updateData.timeExpect = calculateTimeExpect(tempStartDate, tempDueDate, tempStoryPoints);
    }

    if (updateData.hasOwnProperty('status') && updateData.status !== originalIssue.status) {
        console.log(`Attempting to change status of issue ${issueId} from "${originalIssue.status}" to "${updateData.status}" by user ${userId}`);
        //  Kiểm tra Workflow
        if (project.activeWorkflowId) {
            const workflow = project.activeWorkflowId;
            const fromStatus = originalIssue.status;
            const toStatus = updateData.status;

            console.log(`Checking workflow transitions for project ${project._id}: from "${fromStatus}" to "${toStatus}"`);

            const rule = workflow.transitions.find(t => t.from === fromStatus);
            const anyRule = workflow.transitions.find(t => t.from === '__any__');

            let isAllowed = false;
            if (rule && rule.to.includes(toStatus)) {
                isAllowed = true;
            }
            if (!isAllowed && anyRule && anyRule.to.includes(toStatus)) {
                isAllowed = true;
            }

            if (!isAllowed) {
                throw new ApiError(StatusCodes.BAD_REQUEST, `Transition from "${fromStatus}" to "${toStatus}" is not allowed by the current workflow.`);
            }
        }

        // Kiểm tra Sprint có active không
        if (originalIssue.sprintId) {
            const sprint = await sprintDAO.getSprintById(originalIssue.sprintId);
            if (sprint && sprint.status !== 'active') {
                throw new ApiError(StatusCodes.FORBIDDEN, `Cannot change issue status because sprint "${sprint.name}" is not active.`);
            }
        }

        //Kiểm tra quyền: chỉ leader hoặc assignee mới được đổi status
        const leader = project.members.find(m => m.role === 'leader');
        const isLeader = leader && leader.accountId._id.toString() === userId.toString();
        const isAssignee = originalIssue.assigneeId && originalIssue.assigneeId._id.toString() === userId.toString();

        if (!isLeader && !isAssignee) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Only the project leader or the assignee can change the issue status.");
        }
    }

    if (updateData.assigneeId) {
        const isAssigneeMember = await projectDAO.isMemberOfProject(originalIssue.projectId, updateData.assigneeId);
        if (!isAssigneeMember) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Assignee must be a member of the project.");
        }
    }

    //Ghi nhận lại các thay đổi để lưu vào lịch sử
    const changes = [];
    const fieldsToTrack = ['sprintId', 'assigneeId', 'status', 'priority', 'storyPoints', 'dueDate', 'startDate', 'title', 'description', 'requiredSkills'];

    fieldsToTrack.forEach(field => {
        // Chỉ ghi nhận nếu trường đó có trong `updateData` và giá trị thực sự thay đổi
        // So sánh chuỗi để xử lý ObjectId và các kiểu dữ liệu khác một cách nhất quán
        if (updateData.hasOwnProperty(field) && String(originalIssue[field] || '') !== String(updateData[field] || '')) {
            changes.push({
                field: field,
                oldValue: originalIssue[field],
                newValue: updateData[field]
            });
        }
    });

    if (updateData.status) {
        if (updateData.status === "Done") {
            if (!originalIssue.attachments || originalIssue.attachments.length === 0) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "You must submit supporting attachments before the status changes to Done.");
            }

            updateData.resolution = "Done";
            updateData.completedAt = new Date();
        } else {
            updateData.resolution = "Unresolved";
            updateData.completedAt = null;
        }
    }

    const updatedIssue = await issueDAO.updateIssue(issueId, updateData);

    //Sau khi cập nhật thành công, tạo các bản ghi lịch sử
    if (changes.length > 0 && !originalIssue.parentId) { // Chỉ tạo lịch sử cho issue cha
        // Mapping từ tên trường trong DB sang tên hiển thị thân thiện
        const fieldDisplayNames = {
            sprintId: 'Sprint',
            assigneeId: 'Assignee',
            status: 'Status',
            priority: 'Priority',
            storyPoints: 'Story Points',
            dueDate: 'Due Date',
            startDate: 'Start Date',
            title: 'Title',
            description: 'Description',
            requiredSkills: 'Required Skills'
        };

        // Dùng Promise.all để các tiến trình tạo history có thể chạy song song
        await Promise.all(changes.map(change => {
            const displayName = fieldDisplayNames[change.field] || change.field;
            return createHistoryRecord(issueId, userId, displayName, change.oldValue, change.newValue, io);
        }));
    }

    return updatedIssue;
};


const deleteIssueService = async (issueId, userId) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");
    }

    // Kiểm tra quyền: user phải là thành viên của project
    const hasAccess = await projectDAO.isMemberOfProject(issue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    const issueIdsToDelete = [issueId];
    if (!issue.parentId) { // Nếu là issue cha, lấy cả sub-task
        const subtasks = await issueDAO.getSubtasks(issueId);
        subtasks.forEach(sub => issueIdsToDelete.push(sub._id));
    }

    // Xóa tất cả comment và history liên quan
    await commentDAO.deleteManyComments({ issueId: { $in: issueIdsToDelete } });
    await historyDAO.deleteManyHistories({ issueId: { $in: issueIdsToDelete } });

    // Nếu issue này là một task cha (không có parentId), xóa tất cả sub-task của nó
    if (!issue.parentId) {
        await issueDAO.deleteManyIssues({ parentId: issueId });
    }

    // Xóa issue chính
    await issueDAO.deleteIssue(issueId);

    if (!issue.parentId) {
        return { message: "Issue and its sub-tasks deleted successfully." };
    } else {
        return { message: "Sub-task deleted successfully." };
    }
};

const createSubtaskService = async (issueData, creatorId) => {
    const { parentId, title } = issueData;

    if (!parentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Parent issue ID is required to create a sub-task.");
    }

    // Lấy thông tin task cha
    const parentIssue = await issueDAO.getIssueById(parentId);
    if (!parentIssue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parent issue not found.");
    }

    // Sub-task không thể có sub-task (chỉ hỗ trợ 1 cấp)
    if (parentIssue.parentId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot create a sub-task for another sub-task.");
    }

    // Dùng lại hàm createIssueService nhưng thêm parentId và các thông tin kế thừa từ task cha
    const subtaskData = {
        ...issueData,
        projectId: parentIssue.projectId,
        type: "Sub-task",
        title,
    };

    // Gọi hàm tạo issue gốc
    return await createIssueService(subtaskData, creatorId);
};

const getSubtasksService = async (parentId, userId) => {
    // Kiểm tra xem task cha có tồn tại không
    const parentIssue = await issueDAO.getIssueById(parentId);
    if (!parentIssue) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parent issue not found.");
    }

    // Kiểm tra xem người dùng có quyền truy cập vào project của task cha không
    const hasAccess = await projectDAO.isMemberOfProject(parentIssue.projectId, userId);
    if (!hasAccess) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You don't have access to this project.");
    }

    // Lấy danh sách các sub-task
    const subtasks = await issueDAO.getSubtasks(parentId);
    return subtasks;
};

const uploadAttachmentService = async (issueId, userId, file, io) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const project = await projectDAO.checkMemberExists(issue.projectId, userId);
    if (!project) throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");

    // Dữ liệu bóc tách từ Multer-Cloudinary
    const newAttachment = {
        publicId: file.filename, // Trong package này, filename chính là public_id trên Cloudinary
        url: file.path,
        filename: file.originalname,
        uploadedBy: userId
    };

    // Đẩy vào array của Mongoose
    issue.attachments.push(newAttachment);
    await issue.save();

    // Ghi Nhận Lịch Sử + Phát Socket
    await createHistoryRecord(issueId, userId, "Added Attachment", null, newAttachment.filename, io);

    return issue.attachments;
};

const deleteAttachmentService = async (issueId, attachmentId, userId, io) => {
    const issue = await issueDAO.getIssueById(issueId);
    if (!issue) throw new ApiError(StatusCodes.NOT_FOUND, "Issue not found.");

    const project = await projectDAO.checkMemberExists(issue.projectId, userId);
    if (!project) throw new ApiError(StatusCodes.FORBIDDEN, "Access denied.");

    // Tìm file trong issue
    const attachment = issue.attachments.id(attachmentId);
    if (!attachment) throw new ApiError(StatusCodes.NOT_FOUND, "Attachment not found.");

    const filename = attachment.filename;

    try {
        // Xóa file vật lý trên máy chủ Cloudinary
        await cloudinary.uploader.destroy(attachment.publicId);
    } catch (err) {
        console.error("Cloudinary delete object failed", err);
    }

    // Xóa khỏi Database
    issue.attachments.pull(attachmentId);
    await issue.save();

    // Ghi nhận lịch sử + Bắn Real-Time
    await createHistoryRecord(issueId, userId, "Removed Attachment", filename, null, io);

    return issue.attachments;
};

module.exports = {
    createIssueService,
    getIssuesBySprintService,
    getIssuesByProjectService,
    updateIssueService,
    deleteIssueService,
    createSubtaskService,
    getSubtasksService,
    uploadAttachmentService,
    deleteAttachmentService
};