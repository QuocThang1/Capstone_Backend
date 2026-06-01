const { StatusCodes } = require("http-status-codes");
const { getSystemHealthService } = require("../services/adminSystemHealthService");

const getSystemHealth = async (req, res, next) => {
    try {
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: await getSystemHealthService(req.app.get("io")),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSystemHealth,
};
