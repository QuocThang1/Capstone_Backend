const os = require("os");
const mongoose = require("mongoose");
const { getCronJobHealth } = require("./cronService");
const { getRuntimeUsage } = require("./runtimeUsageService");
const { env } = require("../config/env");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const measureCpuPercent = async () => {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime.bigint();
    await sleep(100);
    const elapsedMicroseconds = Number(process.hrtime.bigint() - startTime) / 1000;
    const usage = process.cpuUsage(startUsage);
    return Math.min(Math.round(((usage.user + usage.system) / elapsedMicroseconds) * 100), 100);
};

const measureDatabase = async () => {
    if (mongoose.connection.readyState !== 1) {
        return { status: "Down", latencyMs: null };
    }

    const startedAt = Date.now();
    try {
        await mongoose.connection.db.admin().ping();
        return { status: "Operational", latencyMs: Date.now() - startedAt };
    } catch {
        return { status: "Down", latencyMs: null };
    }
};

const buildIncidents = (services) => services
    .filter((service) => ["Down", "Degraded"].includes(service.status))
    .map((service) => ({
        id: `runtime-${service.id}`,
        title: `${service.name} is ${service.status.toLowerCase()}`,
        affectedService: service.name,
        severity: service.status === "Down" ? "Critical" : "Warning",
        status: "Open",
    }));

const getSystemHealthService = async (io) => {
    const requestStartedAt = Date.now();
    const [cpu, database] = await Promise.all([
        measureCpuPercent(),
        measureDatabase(),
    ]);

    const memory = process.memoryUsage();
    const cronHealth = getCronJobHealth();
    const activeWsConnections = io?.engine?.clientsCount || 0;
    const hasStorageConfig = Boolean(env.cloudinary.cloudName);
    const usage = getRuntimeUsage({
        activeWsConnections,
        runningJobs: cronHealth.runningJobs,
        totalJobs: cronHealth.totalJobs,
    });
    const services = [
        { id: "backend", name: "Backend API", status: "Operational", usagePercent: usage.backend.percent, responseTime: usage.backend.detail, icon: "server" },
        { id: "frontend", name: "Frontend App", status: "Operational", usagePercent: usage.frontend.percent, responseTime: usage.frontend.detail, icon: "layout" },
        { id: "database", name: "Database", status: database.status, usagePercent: usage.database.percent, responseTime: usage.database.detail, icon: "database" },
        { id: "websocket", name: "WebSocket Server", status: io ? "Operational" : "Down", usagePercent: usage.websocket.percent, responseTime: usage.websocket.detail, icon: "activity" },
        { id: "notifications", name: "Notification Service", status: "Operational", usagePercent: usage.notifications.percent, responseTime: usage.notifications.detail, icon: "bell" },
        { id: "jobs", name: "Background Jobs", status: cronHealth.totalJobs ? "Operational" : "Not Configured", usagePercent: usage.jobs.percent, responseTime: usage.jobs.detail, icon: "cpu" },
        { id: "storage", name: "File Storage", status: hasStorageConfig ? "Configured" : "Not Configured", usagePercent: hasStorageConfig ? usage.storage.percent : null, responseTime: hasStorageConfig ? usage.storage.detail : "-", icon: "hard-drive" },
    ];

    return {
        checkedAt: new Date(),
        services,
        metrics: {
            cpu,
            memory: Math.round((memory.rss / os.totalmem()) * 100),
            memoryRssMb: Math.round(memory.rss / 1024 / 1024),
            disk: null,
            apiResponseTime: Date.now() - requestStartedAt,
            activeWsConnections,
            dbConnections: null,
            dbState: mongoose.connection.readyState,
            errorRate: null,
        },
        incidents: buildIncidents(services),
        backgroundJobs: cronHealth.jobs,
    };
};

module.exports = {
    getSystemHealthService,
};
