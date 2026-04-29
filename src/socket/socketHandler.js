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

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

module.exports = initializeSocket;