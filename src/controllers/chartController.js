const chartService = require('../services/chartService');
const { StatusCodes } = require('http-status-codes');

const getBurndownChart = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { sprintId } = req.query;

        const data = await chartService.getBurndownData(projectId, sprintId);
        
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Get burndown chart data successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
};

const getIssueTypeChart = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { sprintId } = req.query;

        const data = await chartService.getIssueTypeData(projectId, sprintId);
        
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Get issue type chart data successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
};

const getWorkloadChart = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { sprintId } = req.query;

        const data = await chartService.getWorkloadData(projectId, sprintId);
        
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Get workload chart data successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
};

const getVelocityChart = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { sprintId } = req.query;

        const data = await chartService.getVelocityData(projectId, sprintId);
        
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Get velocity chart data successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBurndownChart,
    getIssueTypeChart,
    getWorkloadChart,
    getVelocityChart
};
