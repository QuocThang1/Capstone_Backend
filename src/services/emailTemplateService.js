const EmailTemplate = require("../models/emailTemplate");
const { defaultEmailTemplates } = require("../utils/emailTemplates");

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderContent = (content = "", variables = {}, escapeValues = false) => {
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const value = variables[key] ?? "";
        return escapeValues ? escapeHtml(value) : String(value);
    });
};

const getOrCreateEmailTemplate = async (key) => {
    const normalizedKey = String(key || "").trim().toUpperCase();
    const defaultTemplate = defaultEmailTemplates[normalizedKey];

    if (!defaultTemplate) {
        throw new Error(`Unknown email template: ${normalizedKey}`);
    }

    return EmailTemplate.findOneAndUpdate(
        { key: normalizedKey },
        { $setOnInsert: defaultTemplate },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
};

const renderEmailTemplate = async (key, variables = {}) => {
    const template = await getOrCreateEmailTemplate(key);

    if (!template.active) {
        throw new Error(`Email template is disabled: ${template.key}`);
    }

    return {
        subject: renderContent(template.subject, variables),
        text: renderContent(template.text, variables),
        html: renderContent(template.html, variables, true),
    };
};

module.exports = {
    getOrCreateEmailTemplate,
    renderEmailTemplate,
    renderContent,
};
