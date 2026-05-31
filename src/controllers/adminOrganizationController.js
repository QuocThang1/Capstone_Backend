const { StatusCodes } = require("http-status-codes");
const {
    getAllOrganizationsService,
    getOrganizationByIdService,
    createOrganizationService,
    updateOrganizationService,
    deleteOrganizationService,
    toggleOrganizationStatusService,
} = require("../services/adminOrganizationService");
const { createAuditLog } = require("../services/adminAuditLogService");

const writeAuditLog = (req, data) => createAuditLog(req, {
    actorId: req.user?._id,
    actor: req.user?.fullName || req.user?.email || "Admin",
    ...data,
}).catch((error) => console.error("Unable to write audit log:", error.message));

const getAllOrganizations = async (req, res, next) => {
    try {
        const result = await getAllOrganizationsService(req.query);
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const getOrganizationById = async (req, res, next) => {
    try {
        const organization = await getOrganizationByIdService(req.params.orgId);
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Success",
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

const createOrganization = async (req, res, next) => {
    try {
        const organization = await createOrganizationService(req.body);
        await writeAuditLog(req, {
            action: "Organization created",
            target: organization.name,
            details: `Created organization ${organization.name}.`,
        });
        return res.status(StatusCodes.CREATED).json({
            EC: 0,
            EM: "Organization created successfully",
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

const updateOrganization = async (req, res, next) => {
    try {
        const organization = await updateOrganizationService(req.params.orgId, req.body);
        await writeAuditLog(req, {
            action: "Organization updated",
            target: organization.name,
            details: `Updated organization ${organization.name}.`,
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Organization updated successfully",
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

const deleteOrganization = async (req, res, next) => {
    try {
        const result = await deleteOrganizationService(req.params.orgId);
        await writeAuditLog(req, {
            action: "Organization deleted",
            target: result.organizationName,
            severity: "Warning",
            details: `Deleted organization ${result.organizationName}.`,
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: result.message,
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

const toggleOrganizationStatus = async (req, res, next) => {
    try {
        const organization = await toggleOrganizationStatusService(req.params.orgId);
        await writeAuditLog(req, {
            action: organization.status === "Suspended" ? "Organization suspended" : "Organization activated",
            target: organization.name,
            severity: "Warning",
            details: `Changed organization ${organization.name} status to ${organization.status}.`,
        });
        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Organization status updated successfully",
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    toggleOrganizationStatus,
};
