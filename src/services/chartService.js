const Sprint = require('../models/sprint');
const Issue = require('../models/issue');
const Project = require('../models/project');
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

    const project = await Project.findById(projectId).select('boardColumns issueTypes timezone');

    return { sprint, allSprints, project };
};

const getBurndownData = async (projectId, sprintId) => {
    const { sprint, allSprints, project } = await resolveSprint(projectId, sprintId);

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
        
        const sortedColumns = [...(project?.boardColumns || [])].sort((a, b) => a.order - b.order);
        const doneStatusName = sortedColumns.length > 0 ? sortedColumns[sortedColumns.length - 1].name : 'Done';
        
        const pointsCompleted = issues.reduce((sum, issue) => {
            if (issue.status === doneStatusName && issue.completedAt && new Date(issue.completedAt) <= currentDate) {
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
    const { sprint, allSprints, project } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id });

    const issueTypesCount = {};
    const validIssueTypes = project?.issueTypes?.map(t => typeof t === 'string' ? t : t.name) || ['Task', 'Bug', 'Story'];
    validIssueTypes.forEach(t => issueTypesCount[t] = 0);
    issueTypesCount['Other'] = 0;

    issues.forEach(issue => {
        const type = issue.issueType || issue.type;
        if (type && issueTypesCount[type] !== undefined) {
            issueTypesCount[type]++;
        } else {
            issueTypesCount['Other']++;
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
    const { sprint, allSprints, project } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id }).populate('assigneeId', 'username email fullName');

    const memberWorkload = {}; // { accountId: { name, columns: {} } }

    const sortedColumns = [...(project?.boardColumns || [])].sort((a, b) => a.order - b.order);
    const colNames = sortedColumns.length > 0 ? sortedColumns.map(c => c.name) : ['To Do', 'In Progress', 'Done'];

    issues.forEach(issue => {
        const assignee = issue.assigneeId;
        const name = assignee ? (assignee.username || assignee.email) : "Unassigned";
        const id = assignee ? assignee._id.toString() : "unassigned";

        if (!memberWorkload[id]) {
            memberWorkload[id] = { name, columns: {} };
            colNames.forEach(c => memberWorkload[id].columns[c] = 0);
        }

        const points = issue.storyPoints || 0;
        const status = issue.status || colNames[0];

        if (memberWorkload[id].columns[status] !== undefined) {
            memberWorkload[id].columns[status] += points;
        } else {
            memberWorkload[id].columns[colNames[0]] += points;
        }
    });

    const labels = [];
    const datasetsArray = colNames.map(name => ({ label: name, data: [] }));

    Object.values(memberWorkload).forEach(member => {
        labels.push(member.name);
        colNames.forEach((colName, index) => {
            datasetsArray[index].data.push(member.columns[colName]);
        });
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
            datasets: datasetsArray
        }
    };
};

const getVelocityData = async (projectId, sprintId) => {
    const { sprint, allSprints, project } = await resolveSprint(projectId, sprintId);

    if (!sprint) {
        return { noData: true, message: "No active or completed sprint found.", allSprints };
    }

    const issues = await Issue.find({ sprintId: sprint._id }).populate('assigneeId', 'username email fullName');

    const memberVelocity = {}; // { accountId: { name, assigned: 0, onTime: 0, late: 0 } }

    const sortedColumns = [...(project?.boardColumns || [])].sort((a, b) => a.order - b.order);
    const doneStatusName = sortedColumns.length > 0 ? sortedColumns[sortedColumns.length - 1].name : 'Done';

    issues.forEach(issue => {
        const assignee = issue.assigneeId;
        const name = assignee ? (assignee.username || assignee.email) : "Unassigned";
        const id = assignee ? assignee._id.toString() : "unassigned";

        if (!memberVelocity[id]) {
            memberVelocity[id] = { name, assigned: 0, onTime: 0, late: 0 };
        }

        const points = issue.storyPoints || 0;
        memberVelocity[id].assigned += points;

        if (issue.status === doneStatusName) {
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
