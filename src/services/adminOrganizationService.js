const Organization = require("../models/organization");
const Account = require("../models/account");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const normalizeOrganization = (organization) => ({
    id: organization._id.toString(),
    name: organization.name,
    owner: organization.ownerIds?.length
        ? organization.ownerIds
            .map((owner) => owner.fullName || owner.email)
            .filter(Boolean)
            .join(", ")
        : organization.ownerEmail,
    ownerEmail: organization.ownerEmail,
    owners: organization.ownerIds || [],
    ownerIds: organization.ownerIds?.map((owner) => owner._id?.toString?.() || owner.toString()) || [],
    users: organization.users,
    projects: organization.projects,
    status: organization.status,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    avatarColor: "bg-indigo-100 text-indigo-700",
});

const getAllOrganizationsService = async (query) => {
    const { page = 1, limit = 10, search, status } = query;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || 10, 1);
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { ownerEmail: { $regex: search, $options: "i" } },
        ];
    }

    if (status) filter.status = status;

    const [organizations, total] = await Promise.all([
        Organization.find(filter)
            .populate("ownerIds", "fullName email avatar active")
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize),
        Organization.countDocuments(filter),
    ]);

    return {
        organizations: organizations.map(normalizeOrganization),
        total,
        page: currentPage,
        totalPages: Math.ceil(total / pageSize),
    };
};

const createOrganizationService = async (data) => {
    const ownerIds = Array.isArray(data.ownerIds) ? data.ownerIds : [];
    const owners = ownerIds.length
        ? await Account.find({ _id: { $in: ownerIds } }).select("fullName email")
        : [];

    if (ownerIds.length && owners.length !== ownerIds.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "One or more selected owners are invalid");
    }

    const organization = await Organization.create({
        name: data.name,
        ownerEmail: owners[0]?.email || data.ownerEmail || data.owner,
        ownerIds,
        users: data.users ?? Math.max(ownerIds.length, 1),
        projects: data.projects ?? 0,
        status: data.status || "Active",
    });

    const populatedOrganization = await Organization.findById(organization._id)
        .populate("ownerIds", "fullName email avatar active");

    return normalizeOrganization(populatedOrganization);
};

const getOrganizationByIdService = async (orgId) => {
    const organization = await Organization.findById(orgId)
        .populate("ownerIds", "fullName email avatar active");
    if (!organization) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Organization not found");
    }

    return normalizeOrganization(organization);
};

const updateOrganizationService = async (orgId, data) => {
    const ownerIds = Array.isArray(data.ownerIds) ? data.ownerIds : undefined;
    let owners;

    if (ownerIds) {
        owners = await Account.find({ _id: { $in: ownerIds } }).select("fullName email");
        if (owners.length !== ownerIds.length) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "One or more selected owners are invalid");
        }
    }

    const updateData = {
        name: data.name,
        ownerEmail: owners?.[0]?.email || data.ownerEmail || data.owner,
        ownerIds,
        users: data.users ?? (ownerIds ? Math.max(ownerIds.length, 1) : undefined),
        projects: data.projects,
        status: data.status,
    };

    Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
    });

    const organization = await Organization.findByIdAndUpdate(
        orgId,
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
    ).populate("ownerIds", "fullName email avatar active");

    if (!organization) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Organization not found");
    }

    return normalizeOrganization(organization);
};

const deleteOrganizationService = async (orgId) => {
    const organization = await Organization.findByIdAndDelete(orgId);
    if (!organization) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Organization not found");
    }

    return {
        message: "Organization deleted successfully",
        organizationName: organization.name,
    };
};

const toggleOrganizationStatusService = async (orgId) => {
    const organization = await Organization.findById(orgId);
    if (!organization) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Organization not found");
    }

    organization.status = organization.status === "Active" ? "Suspended" : "Active";
    await organization.save();

    const populatedOrganization = await Organization.findById(organization._id)
        .populate("ownerIds", "fullName email avatar active");

    return normalizeOrganization(populatedOrganization);
};

module.exports = {
    getAllOrganizationsService,
    getOrganizationByIdService,
    createOrganizationService,
    updateOrganizationService,
    deleteOrganizationService,
    toggleOrganizationStatusService,
};
