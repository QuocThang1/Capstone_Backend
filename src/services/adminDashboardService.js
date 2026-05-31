const Account = require("../models/account");
const Project = require("../models/project");
const Issue = require("../models/issue");
const Bottleneck = require("../models/bottleneck");
const History = require("../models/history");
const Organization = require("../models/organization");

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const buildGrowthBuckets = (period) => {
    const now = new Date();

    if (period === "day") {
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
            const next = new Date(date);
            next.setDate(date.getDate() + 1);
            return {
                label: `${date.getDate()}/${date.getMonth() + 1}`,
                start: date,
                end: next,
            };
        });
    }

    if (period === "week") {
        return Array.from({ length: 8 }, (_, index) => {
            const end = new Date(now);
            end.setDate(now.getDate() - (7 - index) * 7);
            const start = new Date(end);
            start.setDate(end.getDate() - 7);
            return {
                label: `W${index + 1}`,
                start,
                end,
            };
        });
    }

    if (period === "year") {
        return Array.from({ length: 5 }, (_, index) => {
            const year = now.getFullYear() - 4 + index;
            return {
                label: String(year),
                start: new Date(year, 0, 1),
                end: new Date(year + 1, 0, 1),
            };
        });
    }

    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        return {
            label: monthNames[date.getMonth()],
            start: date,
            end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
        };
    });
};

const getOrganizationGrowth = async (period) => {
    const buckets = buildGrowthBuckets(period);
    const organizations = await Organization.find({
        createdAt: {
            $gte: buckets[0].start,
            $lt: buckets[buckets.length - 1].end,
        },
    }).select("createdAt");

    return buckets.map((bucket) => ({
        month: bucket.label,
        val: organizations.filter(
            (organization) => organization.createdAt >= bucket.start && organization.createdAt < bucket.end
        ).length,
    }));
};

const getPlatformDashboardService = async (query = {}) => {
    const validGrowthPeriods = ["day", "week", "month", "year"];
    const growthPeriod = validGrowthPeriods.includes(query.growthPeriod) ? query.growthPeriod : "month";
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
        totalUsers,
        activeUsers,
        activeProjects,
        completedTasks,
        completedTasksThisMonth,
        bottlenecksDetected,
        bottlenecksThisWeek,
        totalOrganizations,
        organizationGrowthThisMonth,
        totalProjectsThisMonth,
        totalUsersThisMonth,
        projects,
        organizationGrowth,
        organizations,
        recentHistories,
    ] = await Promise.all([
        Account.countDocuments(),
        Account.countDocuments({ active: true }),
        Project.countDocuments(),
        Issue.countDocuments({ resolution: "Done" }),
        Issue.countDocuments({ resolution: "Done", completedAt: { $gte: startOfMonth } }),
        Bottleneck.countDocuments({ status: { $ne: "resolved" } }),
        Bottleneck.countDocuments({ status: { $ne: "resolved" }, createdAt: { $gte: startOfWeek } }),
        Organization.countDocuments(),
        Organization.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Project.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Account.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Project.find()
            .select("members")
            .sort({ updatedAt: -1 })
            .limit(10),
        getOrganizationGrowth(growthPeriod),
        Organization.find()
            .populate("ownerIds", "fullName email")
            .sort({ users: -1, updatedAt: -1 })
            .limit(5),
        History.find()
            .populate("authorId", "fullName email")
            .populate({
                path: "issueId",
                select: "title issueKey projectId",
                populate: { path: "projectId", select: "name" },
            })
            .sort({ createdAt: -1 })
            .limit(7),
    ]);

    const totalMembers = projects.reduce((sum, project) => sum + project.members.length, 0);
    const totalTasks = await Issue.countDocuments();

    const topOrganizations = organizations.map((organization) => ({
        id: organization._id.toString(),
        name: organization.name,
        owner: organization.ownerIds?.length
            ? organization.ownerIds.map((owner) => owner.fullName || owner.email).filter(Boolean).join(", ")
            : organization.ownerEmail,
        users: organization.users,
        projects: organization.projects,
        status: organization.status,
        avatarColor: "bg-indigo-100 text-indigo-700",
    }));

    const recentActivities = recentHistories.map((history) => ({
        id: history._id.toString(),
        type: history.field === "status" ? "update" : "system",
        actor: history.authorId?.fullName || history.authorId?.email || "System",
        action: `updated ${history.field}`,
        target: history.issueId?.issueKey || history.issueId?.title || "an issue",
        time: history.createdAt,
    }));

    return {
        dashboardStats: {
            totalOrganizations,
            activeUsers,
            activeProjects,
            totalTasks: completedTasks,
            completedTasksThisMonth,
            bottlenecksDetected,
            bottlenecksThisWeek,
            systemUptime: "99.9%",
            totalUsers,
            totalMembers,
            totalTasksAll: totalTasks,
            organizationGrowthThisMonth,
            projectGrowthThisMonth: totalProjectsThisMonth,
            userGrowthThisMonth: totalUsersThisMonth,
        },
        organizationGrowth,
        recentActivities,
        systemServices: [
            { name: "Backend API", status: "Operational" },
            { name: "Database", status: "Operational" },
        ],
        organizations: topOrganizations,
    };
};

module.exports = {
    getPlatformDashboardService,
};
