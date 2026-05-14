const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);

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

        socket.on('join_user_room', (userId) => {
            socket.join(`user_${userId}`);
            // console.log(`Socket ${socket.id} joined user room: user_${userId}`);
        });

        socket.on('leave_user_room', (userId) => {
            socket.leave(`user_${userId}`);
            // console.log(`Socket ${socket.id} left user room: user_${userId}`);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

module.exports = initializeSocket;