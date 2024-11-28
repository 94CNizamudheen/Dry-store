const mongoose = require("mongoose");
const { Schema } = mongoose;

const configSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    referrerReward: {
        type: Number,
        default: 0
    },
    newUserReward: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Config = mongoose.model("Config", configSchema);
module.exports = Config;
