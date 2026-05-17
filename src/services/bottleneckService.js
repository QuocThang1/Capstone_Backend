const bottleneckDAO = require("../DAO/bottleneckDAO");
const projectDAO = require("../DAO/projectDAO");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const getAllBottlenecksService = async () => {
    return await bottleneckDAO.getAllBottlenecks();
};

const getBottlenecksByProjectService = async (projectId) => {
    return await bottleneckDAO.getBottlenecksByProjectId(projectId);
};

const getMyBottlenecksService = async (userId) => {
    return await bottleneckDAO.getBottlenecksByUserId(userId);
};

const getBottlenecksByIssueService = async (issueId) => {
    return await bottleneckDAO.getBottlenecksByIssueId(issueId);
};

// 1. NGƯỜI DÙNG / LEADER GỬI YÊU CẦU RESOLVE (Chuyển sang "pending")
const requestResolveBottleneckService = async (bottleneckId, userId) => {
    const bottleneck = await bottleneckDAO.getBottleneckById(bottleneckId);
    if (!bottleneck) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Bottleneck not found.");
    }

    if (bottleneck.status !== "unresolved") {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot resolve a bottleneck that is currently ${bottleneck.status}.`);
    }

    const issue = bottleneck.issueId;
    const project = await projectDAO.getProjectById(issue.projectId);

    // Tìm leader của dự án
    const leaderMember = project.members.find(m => m.role === 'leader');
    const isLeader = leaderMember && leaderMember.accountId._id.toString() === userId.toString();
    const isAssignee = issue.assigneeId && issue.assigneeId.toString() === userId.toString();

    // Logic kiểm soát quyền:
    // Leader được resolve MỌI task
    // Assignee chỉ được resolve task của ĐÚNG BẢN THÂN
    if (!isLeader && !isAssignee) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only the Project Leader or the Issue Assignee can request to resolve this bottleneck.");
    }

    // Task KHÔNG CÓ assignee thì BẮT BUỘC chỉ Leader được làm
    if (!issue.assigneeId && !isLeader) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unassigned issues can only have bottlenecks resolved by the Project Leader.");
    }

    return await bottleneckDAO.updateBottleneckStatus(bottleneckId, {
        status: "pending",
        resolvedBy: userId
    });
};

// 2. LEADER CỦA DỰ ÁN DUYỆT YÊU CẦU (Từ "pending" -> "resolved" hoặc quay về "unresolved")
const approveResolveBottleneckService = async (bottleneckId, isApproved, currentUserId) => {
    // 1. Phải lấy kèm thông tin issueId để biết bottleneck này thuộc dự án nào
    const bottleneck = await bottleneckDAO.getBottleneckById(bottleneckId);
    if (!bottleneck) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Bottleneck not found.");
    }

    if (bottleneck.status !== "pending") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Can only approve bottlenecks that are in 'pending' status.");
    }

    const issue = bottleneck.issueId;
    if (!issue) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Issue linked to this bottleneck no longer exists.");
    }

    // 2. Kiểm tra quyền của người gọi API: Có phải Leader của dự án đó không?
    const project = await projectDAO.getProjectById(issue.projectId);
    const leaderMember = project.members.find(m => m.role === 'leader');
    const isLeader = leaderMember && leaderMember.accountId._id.toString() === currentUserId.toString();

    if (!isLeader) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only the Project Leader has permission to approve this bottleneck resolution.");
    }

    // 3. Tiến hành cập nhật trạng thái theo sự đồng ý của Leader
    const newStatus = isApproved ? "resolved" : "unresolved";
    const updateData = { status: newStatus };

    // Nếu từ chối, xóa ID người gửi yêu cầu (cho phép họ submit phân trần lần sau)
    if (!isApproved) {
        updateData.resolvedBy = null;
    }

    return await bottleneckDAO.updateBottleneckStatus(bottleneckId, updateData);
};

module.exports = {
    getAllBottlenecksService,
    getBottlenecksByProjectService,
    getMyBottlenecksService,
    getBottlenecksByIssueService,
    requestResolveBottleneckService,
    approveResolveBottleneckService
};