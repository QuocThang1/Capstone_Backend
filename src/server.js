const express = require('express')
const cors = require('cors')
const http = require('http')
const { env, getCorsOrigins, validateEnv } = require('./config/env');

validateEnv();

const { Server } = require('socket.io');
const initializeSocket = require('./socket/socketHandler');

const errorHandlingMiddleware = require('./middleware/errorHandling')

const accountRouter = require('./routes/accountRoutes')
const userRouter = require('./routes/userRoutes')
const projectRouter = require('./routes/projectRoutes')
const sprintRouter = require('./routes/sprintRoutes')
const issueRouter = require('./routes/issueRoutes')
const commentRouter = require('./routes/commentRoutes')
const historyRouter = require('./routes/historyRoutes')
const oauthRouter = require('./routes/oauthRoutes')
const workflowRouter = require('./routes/workflowRoutes')
const notificationRouter = require('./routes/notificationRoutes')
const bottleneckRouter = require('./routes/bottleneckRoutes');
const intelligenceDetectRouter = require('./routes/intelligenceDetectRoutes');
const adminRouter = require('./routes/adminRoutes');
const systemSettingsRouter = require('./routes/systemSettingsRoutes');
const maintenanceMode = require('./middleware/maintenanceMode');
const { startCronJobs } = require('./services/cronService');
const { startSystemHealthMonitor } = require('./services/systemHealthMonitorService');
const { trackRuntimeUsage } = require('./services/runtimeUsageService');

const connection = require("./config/database");

const app = express()
const server = http.createServer(app)

app.set('trust proxy', true);

const corsOptions = {
    origin: getCorsOrigins(),
    credentials: true,
};

const io = new Server(server, {
    cors: {
        origin: getCorsOrigins(),
        credentials: true,
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

initializeSocket(io);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(trackRuntimeUsage);

app.get('/api/health', (req, res) => {
    res.status(200).json({
        EC: 0,
        EM: "TASKA backend is running"
    });
});

app.use('/api/admin', adminRouter);
app.use('/v1/api/admin', adminRouter);
app.use('/v1/api/system-settings', systemSettingsRouter);
app.use(maintenanceMode);
app.use('/v1/api/account', accountRouter);
app.use('/v1/api/auth', oauthRouter);
app.use('/v1/api/users', userRouter);
app.use('/v1/api/projects', projectRouter);
app.use('/v1/api/sprints', sprintRouter);
app.use('/v1/api/issues', issueRouter);
app.use('/v1/api/comments', commentRouter);
app.use('/v1/api/history', historyRouter);
app.use('/v1/api/workflows', workflowRouter);
app.use('/v1/api/notifications', notificationRouter);
app.use('/v1/api/bottlenecks', bottleneckRouter);
app.use('/v1/api/intelligence_detect', intelligenceDetectRouter);
app.use('/api/intelligence_detect', intelligenceDetectRouter);
app.use(errorHandlingMiddleware);

(async () => {
    try {
        await connection();

        startCronJobs(io);
        startSystemHealthMonitor(io);

        server.listen(env.port, env.host, () => {
            console.log(`Backend listening on ${env.host}:${env.port}`)
        })
    } catch (error) {
        console.error("Error connecting to DB:", error);
        process.exit(1);
    }
})();
