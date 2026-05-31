const { StatusCodes } = require("http-status-codes");
const { getPlatformDashboardService } = require("../services/adminDashboardService");

const getPlatformDashboard = async (req, res, next) => {
    try {
        const dashboard = await getPlatformDashboardService(req.query);

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: dashboard,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPlatformDashboard,
};
