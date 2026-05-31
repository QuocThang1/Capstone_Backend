const normalizeIp = (ip) => {
    if (!ip) return "Unknown";

    let value = String(ip).trim();

    if (value.startsWith("::ffff:")) {
        value = value.slice("::ffff:".length);
    }

    if (value === "::1" || value === "127.0.0.1" || value === "localhost") {
        return "localhost";
    }

    return value || "Unknown";
};

const getFirstHeaderValue = (value) => {
    if (Array.isArray(value)) return value[0];
    return value;
};

const getClientIp = (req = {}) => {
    const headers = req.headers || {};

    const cloudflareIp = getFirstHeaderValue(headers["cf-connecting-ip"]);
    if (cloudflareIp) return normalizeIp(cloudflareIp);

    const trueClientIp = getFirstHeaderValue(headers["true-client-ip"]);
    if (trueClientIp) return normalizeIp(trueClientIp);

    const forwardedFor = getFirstHeaderValue(headers["x-forwarded-for"]);
    if (forwardedFor) {
        const firstIp = String(forwardedFor).split(",")[0]?.trim();
        if (firstIp) return normalizeIp(firstIp);
    }

    const realIp = getFirstHeaderValue(headers["x-real-ip"]);
    if (realIp) return normalizeIp(realIp);

    if (req.ip) return normalizeIp(req.ip);
    if (req.socket?.remoteAddress) return normalizeIp(req.socket.remoteAddress);
    if (req.connection?.remoteAddress) return normalizeIp(req.connection.remoteAddress);

    return "Unknown";
};

module.exports = {
    getClientIp,
    normalizeIp,
};
