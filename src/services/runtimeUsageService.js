const USAGE_WINDOW_MS = 10000;
const DEFAULT_REQUEST_TARGET = 20;
const DEFAULT_WEBSOCKET_TARGET = 100;
const DEFAULT_DATABASE_TARGET = 50;
const DEFAULT_FRONTEND_TARGET = 100;

const requestEvents = [];
const databaseEvents = [];
const frontendClients = new Set();

const getPositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const pruneRequestEvents = (now = Date.now()) => {
    const cutoff = now - USAGE_WINDOW_MS;
    while (requestEvents.length && requestEvents[0].timestamp < cutoff) {
        requestEvents.shift();
    }
};

const pruneDatabaseEvents = (now = Date.now()) => {
    const cutoff = now - USAGE_WINDOW_MS;
    while (databaseEvents.length && databaseEvents[0] < cutoff) {
        databaseEvents.shift();
    }
};

const getPercent = (value, target) => Math.min(Math.round((value / target) * 100), 100);

const getCategory = (path) => {
    if (path.includes("/notifications")) return "notifications";
    if (path.includes("/attachments")) return "storage";
    return "backend";
};

const shouldTrackRequest = (path) => !path.includes("/system/health")
    && !path.includes("/system/metrics")
    && !path.includes("/system/health-check");

const trackRuntimeUsage = (req, res, next) => {
    if (shouldTrackRequest(req.path)) {
        requestEvents.push({
            category: getCategory(req.path),
            timestamp: Date.now(),
        });
        pruneRequestEvents();
    }
    next();
};

const trackDatabaseOperation = (event) => {
    if (event.commandName === "ping") return;
    databaseEvents.push(Date.now());
    pruneDatabaseEvents();
};

const addFrontendClient = (socketId) => {
    frontendClients.add(socketId);
};

const removeFrontendClient = (socketId) => {
    frontendClients.delete(socketId);
};

const getRuntimeUsage = ({ activeWsConnections = 0, runningJobs = 0, totalJobs = 0 } = {}) => {
    pruneRequestEvents();
    pruneDatabaseEvents();
    const requestTarget = getPositiveNumber(process.env.SYSTEM_HEALTH_REQUEST_TARGET, DEFAULT_REQUEST_TARGET);
    const websocketTarget = getPositiveNumber(process.env.SYSTEM_HEALTH_WEBSOCKET_TARGET, DEFAULT_WEBSOCKET_TARGET);
    const databaseTarget = getPositiveNumber(process.env.SYSTEM_HEALTH_DATABASE_TARGET, DEFAULT_DATABASE_TARGET);
    const frontendTarget = getPositiveNumber(process.env.SYSTEM_HEALTH_FRONTEND_TARGET, DEFAULT_FRONTEND_TARGET);
    const counts = requestEvents.reduce((accumulator, event) => {
        accumulator[event.category] = (accumulator[event.category] || 0) + 1;
        return accumulator;
    }, {});
    const recentRequests = requestEvents.length;
    const notificationRequests = counts.notifications || 0;
    const storageRequests = counts.storage || 0;

    return {
        backend: {
            percent: getPercent(recentRequests, requestTarget),
            detail: `${recentRequests} req / ${USAGE_WINDOW_MS / 1000}s`,
        },
        websocket: {
            percent: getPercent(activeWsConnections, websocketTarget),
            detail: `${activeWsConnections} connected`,
        },
        frontend: {
            percent: getPercent(frontendClients.size, frontendTarget),
            detail: `${frontendClients.size} online`,
        },
        database: {
            percent: getPercent(databaseEvents.length, databaseTarget),
            detail: `${databaseEvents.length} ops / ${USAGE_WINDOW_MS / 1000}s`,
        },
        notifications: {
            percent: getPercent(notificationRequests, requestTarget),
            detail: `${notificationRequests} req / ${USAGE_WINDOW_MS / 1000}s`,
        },
        jobs: {
            percent: totalJobs ? getPercent(runningJobs, totalJobs) : null,
            detail: `${runningJobs} running / ${totalJobs} scheduled`,
        },
        storage: {
            percent: getPercent(storageRequests, requestTarget),
            detail: `${storageRequests} req / ${USAGE_WINDOW_MS / 1000}s`,
        },
    };
};

module.exports = {
    addFrontendClient,
    getRuntimeUsage,
    removeFrontendClient,
    trackDatabaseOperation,
    trackRuntimeUsage,
};
