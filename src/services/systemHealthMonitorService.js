const { getSystemHealthService } = require("./adminSystemHealthService");

const SYSTEM_HEALTH_ROOM = "admin_system_health";
const SYSTEM_HEALTH_EVENT = "system_health_updated";
const MONITOR_INTERVAL_MS = 2000;

let monitorTimer;
let lastFingerprint;
let activeSnapshotPromise;

const buildFingerprint = (snapshot) => JSON.stringify({
    services: snapshot.services.map(({ id, status, responseTime, usagePercent }) => ({
        id,
        status,
        usagePercent,
        responseTime: id === "backend" || id === "database" ? undefined : responseTime,
    })),
    metrics: {
        cpu: snapshot.metrics.cpu,
        memory: snapshot.metrics.memory,
        memoryRssMb: snapshot.metrics.memoryRssMb,
        activeWsConnections: snapshot.metrics.activeWsConnections,
        dbState: snapshot.metrics.dbState,
    },
    incidents: snapshot.incidents,
    backgroundJobs: snapshot.backgroundJobs,
});

const publishSystemHealth = async (io, { force = false } = {}) => {
    if (!io) return null;

    if (!activeSnapshotPromise) {
        activeSnapshotPromise = getSystemHealthService(io).finally(() => {
            activeSnapshotPromise = null;
        });
    }

    const snapshot = await activeSnapshotPromise;
    const fingerprint = buildFingerprint(snapshot);

    if (force || fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        io.to(SYSTEM_HEALTH_ROOM).emit(SYSTEM_HEALTH_EVENT, snapshot);
    }

    return snapshot;
};

const startSystemHealthMonitor = (io) => {
    if (monitorTimer) return;

    publishSystemHealth(io, { force: true }).catch((error) => {
        console.error("[System Health] Initial snapshot failed:", error.message);
    });

    monitorTimer = setInterval(() => {
        publishSystemHealth(io).catch((error) => {
            console.error("[System Health] Snapshot failed:", error.message);
        });
    }, MONITOR_INTERVAL_MS);

    monitorTimer.unref?.();
};

module.exports = {
    SYSTEM_HEALTH_EVENT,
    SYSTEM_HEALTH_ROOM,
    publishSystemHealth,
    startSystemHealthMonitor,
};
