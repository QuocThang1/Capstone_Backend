const mongoose = require("mongoose");
const { trackDatabaseOperation } = require("../services/runtimeUsageService");
const { env } = require("./env");

const dbState = [
    { value: 0, label: "Disconnected" },
    { value: 1, label: "Connected" },
    { value: 2, label: "Connecting" },
    { value: 3, label: "Disconnecting" },
];

const connection = async () => {
    try {
        const dbUri = env.mongodbUri;
        if (!dbUri || typeof dbUri !== "string") {
            console.error("\n ERROR: MONGODB_URI is missing or invalid.");
            console.error("   Make sure your environment contains: MONGODB_URI=mongodb+srv://...");
            process.exit(1);
        }

        // Standardized Mongoose Connection
        await mongoose.connect(dbUri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            monitorCommands: true,
        });
        mongoose.connection.getClient().on("commandStarted", trackDatabaseOperation);

        // Success Log (hide credentials, show host)
        const dbHost = dbUri.split("@")[1] || "mongodb";
        console.log(`\n MongoDB Connected to: ${dbHost}`);

        // Handle connection errors and disconnects
        mongoose.connection.on("error", (err) => {
            console.error("\n MongoDB connection error:", err.message);
            process.exit(1);
        });

        mongoose.connection.on("disconnected", () => {
            console.error("\n MongoDB disconnected unexpectedly");
            process.exit(1);
        });

        const state = mongoose.connection.readyState;
        console.log(`Status: ${dbState.find((f) => f.value === state).label}`);
    } catch (error) {
        console.error("\n Error connecting to MongoDB:", error.message);
        if (error.name === 'MongoNetworkError') {
            console.error("Network Error: Check your MONGODB_URI and internet connection.");
        } else if (error.name === 'MongoAuthenticationError') {
            console.error("Authentication Error: Check your MongoDB credentials in .env.");
        }
        process.exit(1);
    }
};

module.exports = connection;
