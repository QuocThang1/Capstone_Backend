const mongoose = require("mongoose");

const transitionSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true,
    },
    to: [{
        type: String,
    }],
}, { _id: false });

module.exports = transitionSchema;