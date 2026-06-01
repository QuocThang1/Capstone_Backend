const {
    SYSTEM_HEALTH_ROOM,
    publishSystemHealth,
} = require('../services/systemHealthMonitorService');
const {
    addFrontendClient,
    removeFrontendClient,
} = require('../services/runtimeUsageService');

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);
        addFrontendClient(socket.id);

        // Sự kiện khi người dùng tham gia vào một phòng issue
        socket.on('join_issue_room', (issueId) => {
            socket.join(issueId);
            // console.log(`User ${socket.id} joined room ${issueId}`);
        });

        // Sự kiện khi người dùng rời khỏi một phòng issue
        socket.on('leave_issue_room', (issueId) => {
            socket.leave(issueId);
            // console.log(`User ${socket.id} left room ${issueId}`);
        });

        socket.on('join_project_room', (projectId) => {
            socket.join(projectId);
            // console.log(`User ${socket.id} joined room ${projectId}`);
        });

        socket.on('leave_project_room', (projectId) => {
            socket.leave(projectId);
            // console.log(`User ${socket.id} left room ${projectId}`);
        });

        socket.on('join_project_history_room', (projectId) => {
            socket.join(`project_history_${projectId}`);
            // console.log(`User ${socket.id} joined history room for project ${projectId}`);
        });

        socket.on('leave_project_history_room', (projectId) => {
            socket.leave(`project_history_${projectId}`);
        });

        socket.on('join_sprint_history_room', (sprintId) => {
            if (sprintId) {
                socket.join(`sprint_history_${sprintId}`);
            }
        });

        socket.on('leave_sprint_history_room', (sprintId) => {
            if (sprintId) {
                socket.leave(`sprint_history_${sprintId}`);
            }
        });

        socket.on('join_user_room', (userId) => {
            socket.join(`user_${userId}`);
            // console.log(`Socket ${socket.id} joined user room: user_${userId}`);
        });

        socket.on('leave_user_room', (userId) => {
            socket.leave(`user_${userId}`);
            // console.log(`Socket ${socket.id} left user room: user_${userId}`);
        });

        socket.on('join_admin_audit_logs', () => {
            socket.join('admin_audit_logs');
        });

        socket.on('leave_admin_audit_logs', () => {
            socket.leave('admin_audit_logs');
        });

        socket.on('join_admin_system_health', () => {
            socket.join(SYSTEM_HEALTH_ROOM);
            publishSystemHealth(io, { force: true }).catch((error) => {
                console.error('[System Health] Socket snapshot failed:', error.message);
            });
        });

        socket.on('leave_admin_system_health', () => {
            socket.leave(SYSTEM_HEALTH_ROOM);
        });

        socket.on('disconnect', () => {
            removeFrontendClient(socket.id);
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

module.exports = initializeSocket;
