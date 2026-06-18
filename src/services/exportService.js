const exceljs = require("exceljs");
const PDFDocument = require("pdfkit-table");
const moment = require("moment-timezone");
const path = require("path");
const Project = require("../models/project");
const Sprint = require("../models/sprint");
const Issue = require("../models/issue");

const getProjectFullData = async (projectId) => {
    const project = await Project.findById(projectId).populate("members.accountId", "fullName email").lean();
    if (!project) throw new Error("Project not found");

    const sprints = await Sprint.find({ projectId }).sort({ startDate: 1 }).lean();
    const issues = await Issue.find({ projectId })
        .populate("assigneeId", "fullName email")
        .populate("reporterId", "fullName email")
        .populate("sprintId", "name")
        .sort({ createdAt: -1 })
        .lean();

    return { project, sprints, issues };
};

const generateExcelBuffer = async (projectId) => {
    const { project, sprints, issues } = await getProjectFullData(projectId);
    const tz = project.timezone || "UTC";

    const workbook = new exceljs.Workbook();
    workbook.creator = "Taska System";

    // Sheet 1: Project Info
    const sheetProject = workbook.addWorksheet("Project Info");
    sheetProject.columns = [
        { header: "Attribute", key: "attr", width: 20 },
        { header: "Value", key: "val", width: 50 },
    ];
    sheetProject.addRow({ attr: "Project Name", val: project.name });
    sheetProject.addRow({ attr: "Key", val: project.key });
    sheetProject.addRow({ attr: "Description", val: project.description || "N/A" });
    sheetProject.addRow({ attr: "Created At", val: moment(project.createdAt).tz(tz).format("YYYY-MM-DD HH:mm:ss") });
    sheetProject.addRow({ attr: "Total Members", val: project.members?.length || 0 });

    // Format Headers
    sheetProject.getRow(1).font = { bold: true };
    sheetProject.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // Sheet 2: Sprints
    const sheetSprints = workbook.addWorksheet("Sprints");
    sheetSprints.columns = [
        { header: "Sprint Name", key: "name", width: 30 },
        { header: "Status", key: "status", width: 15 },
        { header: "Goal", key: "goal", width: 40 },
        { header: "Start Date", key: "start", width: 20 },
        { header: "End Date", key: "end", width: 20 },
    ];
    sprints.forEach(s => {
        sheetSprints.addRow({
            name: s.name,
            status: s.status,
            goal: s.goal || "N/A",
            start: s.startDate ? moment(s.startDate).tz(tz).format("YYYY-MM-DD") : "N/A",
            end: s.endDate ? moment(s.endDate).tz(tz).format("YYYY-MM-DD") : "N/A",
        });
    });
    sheetSprints.getRow(1).font = { bold: true };
    sheetSprints.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // Sheet 3: Issues
    const sheetIssues = workbook.addWorksheet("Issues");
    sheetIssues.columns = [
        { header: "Issue Key", key: "key", width: 15 },
        { header: "Summary", key: "summary", width: 40 },
        { header: "Description", key: "description", width: 50 },
        { header: "Type", key: "type", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Priority", key: "priority", width: 15 },
        { header: "Assignee", key: "assignee", width: 25 },
        { header: "Sprint", key: "sprint", width: 20 },
        { header: "Story Points", key: "points", width: 15 },
        { header: "Start Date", key: "start", width: 20 },
        { header: "Due Date", key: "due", width: 20 },
    ];
    issues.forEach(iss => {
        // Simple HTML stripping for description
        let plainDesc = iss.description || "N/A";
        if (typeof plainDesc === 'string') plainDesc = plainDesc.replace(/<[^>]*>?/gm, '');

        sheetIssues.addRow({
            key: iss.issueKey,
            summary: iss.title || "No Title",
            description: plainDesc,
            type: iss.issueType,
            status: iss.status,
            priority: iss.priority,
            assignee: iss.assigneeId?.fullName || "Unassigned",
            sprint: iss.sprintId?.name || "Backlog",
            points: iss.storyPoints || 0,
            start: iss.startDate ? moment(iss.startDate).tz(tz).format("YYYY-MM-DD") : "N/A",
            due: iss.dueDate ? moment(iss.dueDate).tz(tz).format("YYYY-MM-DD") : "N/A",
        });
    });
    sheetIssues.getRow(1).font = { bold: true };
    sheetIssues.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    return await workbook.xlsx.writeBuffer();
};

const generatePdfBuffer = async (projectId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { project, sprints, issues } = await getProjectFullData(projectId);
            const tz = project.timezone || "UTC";
            
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => resolve(Buffer.concat(buffers)));

            // Register Unicode Font
            const fontPath = path.join(__dirname, "../assets/Roboto-Regular.ttf");
            doc.font(fontPath);

            const tableOptions = {
                width: 500,
                prepareHeader: () => doc.font(fontPath).fontSize(10),
                prepareRow: () => doc.font(fontPath).fontSize(10),
            };

            // Add Header
            doc.fontSize(20).text(`Project Report: ${project.name}`, { align: "center" });
            doc.moveDown();
            
            // Project Summary Table
            const projectTable = {
                title: "Project Summary",
                headers: ["Attribute", "Value"],
                rows: [
                    ["Project Key", project.key],
                    ["Total Members", (project.members?.length || 0).toString()],
                    ["Total Sprints", sprints.length.toString()],
                    ["Total Issues", issues.length.toString()],
                ],
            };
            await doc.table(projectTable, tableOptions);
            doc.moveDown();

            // Sprints Table
            if (sprints.length > 0) {
                const sprintRows = sprints.map(s => [
                    s.name, 
                    s.status, 
                    s.startDate ? moment(s.startDate).tz(tz).format("YYYY-MM-DD") : "N/A",
                    s.endDate ? moment(s.endDate).tz(tz).format("YYYY-MM-DD") : "N/A"
                ]);
                const sprintTable = {
                    title: "Sprints List",
                    headers: ["Name", "Status", "Start Date", "End Date"],
                    rows: sprintRows,
                };
                await doc.table(sprintTable, tableOptions);
                doc.moveDown();
            }

            // Issues Table (limit to recent 50 to avoid huge PDFs, or include all)
            if (issues.length > 0) {
                const issueRows = issues.map(iss => [
                    iss.issueKey || "N/A",
                    iss.title || "No Title", // No truncation, let pdfkit-table auto-wrap
                    iss.sprintId?.name || "Backlog",
                    (iss.storyPoints || 0).toString(),
                    iss.dueDate ? moment(iss.dueDate).tz(tz).format("MM-DD") : "N/A",
                    iss.assigneeId?.fullName || "Unassigned"
                ]);
                const issueTable = {
                    title: "Issues List",
                    headers: ["Key", "Title", "Sprint", "Pts", "Due", "Assignee"],
                    rows: issueRows,
                };
                await doc.table(issueTable, {
                    ...tableOptions,
                    columnsSize: [50, 160, 70, 30, 40, 150] // Total: 500
                });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateExcelBuffer,
    generatePdfBuffer
};
