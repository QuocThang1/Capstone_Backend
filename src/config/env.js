const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    return String(value).trim().toLowerCase() === "true";
};

const parseNumber = (value, defaultValue) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const trimTrailingSlash = (value) => {
    if (!value) return value;
    return String(value).replace(/\/+$/, "");
};

const clientUrl = trimTrailingSlash(process.env.CLIENT_URL);
const serverUrl = trimTrailingSlash(process.env.SERVER_URL);
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => trimTrailingSlash(origin.trim()))
    .filter(Boolean);

const env = {
    nodeEnv: NODE_ENV,
    isProduction,
    port: process.env.PORT || 8080,
    host: process.env.HOST || "0.0.0.0",
    clientUrl,
    serverUrl,
    corsAllowedOrigins,
    mongodbUri: process.env.MONGODB_URI,
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
    },
    mail: {
        host: process.env.MAIL_HOST,
        port: parseNumber(process.env.MAIL_PORT, 587),
        secure: parseBoolean(process.env.MAIL_SECURE, false),
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
        from: process.env.MAIL_FROM,
        replyTo: process.env.MAIL_REPLY_TO,
    },
    oauth: {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        githubClientId: process.env.GITHUB_CLIENT_ID,
        githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    ai: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        groqApiKey: process.env.GROQ_API_KEY,
    },
    systemHealth: {
        requestTarget: process.env.SYSTEM_HEALTH_REQUEST_TARGET,
        websocketTarget: process.env.SYSTEM_HEALTH_WEBSOCKET_TARGET,
        databaseTarget: process.env.SYSTEM_HEALTH_DATABASE_TARGET,
        frontendTarget: process.env.SYSTEM_HEALTH_FRONTEND_TARGET,
    },
};

const getCorsOrigins = () => {
    const origins = new Set();
    if (env.clientUrl) origins.add(env.clientUrl);
    env.corsAllowedOrigins.forEach((origin) => origins.add(origin));
    if (!env.isProduction) {
        origins.add("http://localhost:5173");
        origins.add("http://127.0.0.1:5173");
    }
    return [...origins];
};

const validateEnv = () => {
    if (!env.isProduction && !env.clientUrl) {
        env.clientUrl = "http://localhost:5173";
    }

    const required = [
        ["MONGODB_URI", env.mongodbUri],
        ["JWT_SECRET", env.jwt.secret],
        ["CLIENT_URL", env.clientUrl],
        ["MAIL_HOST", env.mail.host],
        ["MAIL_PORT", process.env.MAIL_PORT],
        ["MAIL_SECURE", process.env.MAIL_SECURE],
        ["MAIL_USER", env.mail.user],
        ["MAIL_PASS", env.mail.pass],
        ["MAIL_FROM", env.mail.from],
        ["MAIL_REPLY_TO", env.mail.replyTo],
    ];

    if (env.isProduction) {
        required.push(["SERVER_URL", env.serverUrl]);
    }

    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (!["true", "false", undefined, ""].includes(process.env.MAIL_SECURE)) {
        throw new Error('MAIL_SECURE must be "true" or "false".');
    }

    if (process.env.MAIL_PORT && !Number.isFinite(Number(process.env.MAIL_PORT))) {
        throw new Error("MAIL_PORT must be a valid number.");
    }

    if (env.isProduction && String(env.jwt.secret).length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
};

module.exports = {
    env,
    getCorsOrigins,
    validateEnv,
};
