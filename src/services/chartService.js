const Sprint = require('../models/sprint');
const Issue = require('../models/issue');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

const resolveSprint = async (projectId, sprintId) => {
    let sprint;
    if (sprintId) {
        sprint = await Sprint.findOne({ _id: sprintId, projectId });
    } else {
        sprint = await Sprint.findOne({ projectId, status: 'active' });
        if (!sprint) {
            sprint = await Sprint.findOne({ projectId, status: 'completed' }).sort({ endDate: -1 });
        }
    }

    const allSprints = await Sprint.find({ 
        projectId, 
        status: { $in: ['active', 'completed'] } 
    }).select('_id name status').sort({ createdAt: -1 });

    return { sprint, allSprints };
};

const getBurndownData = async (projectId, sprintId) => {
    const { sprint, allSprints } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }
    if (!sprint.startDate || !sprint.endDate) {
        return { noData: true, message: "Sprint is missing start or end dates.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id });
    const totalPoints = issues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

    const start = new Date(sprint.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(sprint.endDate);
    end.setHours(23, 59, 59, 999);

    const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    const labels = [];
    const idealData = [];
    const actualData = [];
    
    const pointDropPerDay = durationDays > 0 ? (totalPoints / durationDays) : 0;
    const now = new Date();

    for (let i = 0; i <= durationDays; i++) {
        const currentDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        currentDate.setHours(23, 59, 59, 999);
        
        labels.push(`Day ${i}`);
        
        const idealPoint = Math.max(0, totalPoints - (pointDropPerDay * i));
        idealData.push(Math.round(idealPoint * 10) / 10);
        
        const pointsCompleted = issues.reduce((sum, issue) => {
            if (issue.status === 'Done' && issue.completedAt && new Date(issue.completedAt) <= currentDate) {
                return sum + (issue.storyPoints || 0);
            }
            return sum;
        }, 0);
        
        if (currentDate > now && sprint.status === 'active') {
            actualData.push(null);
        } else {
            actualData.push(totalPoints - pointsCompleted);
        }
    }

    return {
        sprint: {
            id: sprint._id,
            name: sprint.name,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status
        },
        allSprints,
        labels,
        datasets: {
            ideal: idealData,
            actual: actualData
        },
        totalPoints
    };
};

const getIssueTypeData = async (projectId, sprintId) => {
    const { sprint, allSprints } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id });

    const issueTypesCount = {
        Bug: 0,
        Task: 0,
        Story: 0,
        Epic: 0,
        Other: 0
    };

    issues.forEach(issue => {
        const type = issue.issueType || issue.type || 'Task';
        if (issueTypesCount[type] !== undefined) {
            issueTypesCount[type]++;
        } else {
            issueTypesCount.Other++;
        }
    });

    const issueTypeDistribution = {
        labels: [],
        data: []
    };
    
    Object.keys(issueTypesCount).forEach(key => {
        if (issueTypesCount[key] > 0) {
            issueTypeDistribution.labels.push(key);
            issueTypeDistribution.data.push(issueTypesCount[key]);
        }
    });

    return {
        sprint: {
            id: sprint._id,
            name: sprint.name,
            status: sprint.status
        },
        allSprints,
        issueTypeDistribution
    };
};

const getWorkloadData = async (projectId, sprintId) => {
    const { sprint, allSprints } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id }).populate('assigneeId', 'username email fullName');

    const memberWorkload = {}; // { accountId: { name, todo: 0, inprogress: 0, done: 0 } }

    issues.forEach(issue => {
        const assignee = issue.assigneeId;
        const name = assignee ? (assignee.username || assignee.email) : "Unassigned";
        const id = assignee ? assignee._id.toString() : "unassigned";

        if (!memberWorkload[id]) {
            memberWorkload[id] = { name, todo: 0, inprogress: 0, done: 0 };
        }

        const points = issue.storyPoints || 0;
        const status = issue.status || 'To Do';

        if (status === 'Done') {
            memberWorkload[id].done += points;
        } else if (status === 'To Do') {
            memberWorkload[id].todo += points;
        } else {
            // Assume any other status (In Progress, Testing) is In Progress
            memberWorkload[id].inprogress += points;
        }
    });

    const labels = [];
    const todoData = [];
    const inprogressData = [];
    const doneData = [];

    Object.values(memberWorkload).forEach(member => {
        labels.push(member.name);
        todoData.push(member.todo);
        inprogressData.push(member.inprogress);
        doneData.push(member.done);
    });

    return {
        sprint: {
            id: sprint._id,
            name: sprint.name,
            status: sprint.status
        },
        allSprints,
        workloadDistribution: {
            labels,
            datasets: {
                todo: todoData,
                inprogress: inprogressData,
                done: doneData
            }
        }
    };
};

const getVelocityData = async (projectId, sprintId) => {
    const { sprint, allSprints } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id }).populate('assigneeId', 'username email fullName');

    const memberVelocity = {}; // { accountId: { name, assigned: 0, onTime: 0, late: 0 } }

    issues.forEach(issue => {
        const assignee = issue.assigneeId;
        const name = assignee ? (assignee.username || assignee.email) : "Unassigned";
        const id = assignee ? assignee._id.toString() : "unassigned";

        if (!memberVelocity[id]) {
            memberVelocity[id] = { name, assigned: 0, onTime: 0, late: 0 };
        }

        const points = issue.storyPoints || 0;
        memberVelocity[id].assigned += points;

        if (issue.status === 'Done') {
            const completedTime = issue.completedAt ? new Date(issue.completedAt) : new Date();
            // So sánh với dueDate của task, nếu không có thì lấy endDate của sprint
            const dueTime = issue.dueDate ? new Date(issue.dueDate) : (sprint.endDate ? new Date(sprint.endDate) : new Date());
            
            // Xóa giờ để so sánh chính xác theo ngày
            completedTime.setHours(0,0,0,0);
            dueTime.setHours(0,0,0,0);

            if (completedTime <= dueTime) {
                memberVelocity[id].onTime += points;
            } else {
                memberVelocity[id].late += points;
            }
        }
    });

    const labels = [];
    const assignedData = [];
    const onTimeData = [];
    const lateData = [];

    Object.values(memberVelocity).forEach(member => {
        labels.push(member.name);
        assignedData.push(member.assigned);
        onTimeData.push(member.onTime);
        lateData.push(member.late);
    });

    return {
        sprint: {
            id: sprint._id,
            name: sprint.name,
            status: sprint.status
        },
        allSprints,
        velocityDistribution: {
            labels,
            datasets: {
                assigned: assignedData,
                onTime: onTimeData,
                late: lateData
            }
        }
    };
};

module.exports = {
    getBurndownData,
    getIssueTypeData,
    getWorkloadData,
    getVelocityData
};
