const Bottleneck = require("../models/bottleneck");

class BottleneckDAO {
    async createOrUpdateBottleneck(data) {
        // Tìm xem issue này đã có cảnh báo (tên tương ứng) đang chờ xử lý hay chưa
        const existing = await Bottleneck.findOne({
            issueId: data.issueId,
            name: data.name,
            status: { $ne: "unresolved, pending" },
        });

        if (existing) {
            // Đang có vi phạm và chưa được giải quyết tay -> Cập nhật tiếp số giờ (content) và level
            existing.content = data.content;
            existing.level = data.level;
            return await existing.save();
        } else {
            // Hoặc là chưa tồn tại, hoặc cái cũ đã được Resolve nên mình tạo vi phạm mới
            const newBottleneck = new Bottleneck(data);
            return await newBottleneck.save();
        }
    }

    async getBottlenecksByIssueId(issueId) {
        return await Bottleneck.find({ issueId }).sort({ createdAt: -1 });
    }

    async getBottleneckById(id) {
        return await Bottleneck.findById(id).populate('issueId');
    }

    // Lấy TẤT CẢ bottleneck (thường dùng cho Admin hoặc report tổng)
    async getAllBottlenecks() {
        return await Bottleneck.find()
            .populate({
                path: 'issueId',
                select: 'issueKey title assigneeId projectId',
                populate: { path: 'assigneeId', select: 'fullName username' }
            })
            .sort({ createdAt: -1 });
    }

    async getBottlenecksByProjectId(projectId) {
        return await Bottleneck.find()
            .populate({
                path: 'issueId',
                match: { projectId: projectId },
                select: 'issueKey title assigneeId projectId',
                populate: { path: 'assigneeId', select: 'fullName username' },
            })
            .populate('resolvedBy', 'fullName username')
            .sort({ createdAt: -1 });
    }

    // Lấy bottleneck theo các thẻ đang giao cho 1 User Cụ thể
    async getBottlenecksByUserId(userId) {
        // Phải liên kết bảng, tìm Bottleneck nào có issue gán cho userId này
        return await Bottleneck.find()
            .populate({
                path: 'issueId',
                match: { assigneeId: userId }, // Chỉ giữ lại các Issue được assign cho User
                select: 'issueKey title assigneeId projectId',
                populate: { path: 'assigneeId', select: 'fullName username' }
            })
            .sort({ createdAt: -1 })
            .then(bottlenecks => bottlenecks.filter(b => b.issueId !== null)); // Loại bỏ các bản ghi không khớp User
    }

    async updateBottleneckStatus(id, updateData) {
        return await Bottleneck.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );
    }
}

module.exports = new BottleneckDAO();