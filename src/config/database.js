const mongoose = require("mongoose");
const { trackDatabaseOperation } = require("../services/runtimeUsageService");

const dbState = [
    { value: 0, label: "Disconnected" },
    { value: 1, label: "Connected" },
    { value: 2, label: "Connecting" },
    { value: 3, label: "Disconnecting" },
];

const connection = async () => {
    try {
        // Strict URI Validation
        const dbUri = process.env.MONGO_DB_URL;
        if (!dbUri || typeof dbUri !== 'string') {
            console.error("\n ERROR: MONGO_DB_URL is missing or invalid in .env file.");
            console.error("   Make sure your .env file contains: MONGO_DB_URL=mongodb+srv://...");
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
        const dbHost = dbUri.split('@')[1] || 'localhost';
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
            console.error("Network Error: Check your MONGO_DB_URL and internet connection.");
        } else if (error.name === 'MongoAuthenticationError') {
            console.error("Authentication Error: Check your MongoDB credentials in .env.");
        }
        process.exit(1);
    }
};

module.exports = connection;
