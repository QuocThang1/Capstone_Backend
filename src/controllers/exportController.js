const { generateExcelBuffer, generatePdfBuffer } = require("../services/exportService");
const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/ApiError");

const exportToExcel = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const buffer = await generateExcelBuffer(projectId);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="project_${projectId}_export.xlsx"`
        );

        res.send(buffer);
    } catch (error) {
        next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to export Excel: " + error.message));
    }
};

const exportToPdf = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const buffer = await generatePdfBuffer(projectId);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="project_${projectId}_report.pdf"`
        );

        res.send(buffer);
    } catch (error) {
        next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to export PDF: " + error.message));
    }
};

module.exports = {
    exportToExcel,
    exportToPdf
};
