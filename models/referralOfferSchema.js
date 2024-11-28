const mongoose = require("mongoose");
const { Schema } = mongoose;

const referralOfferSchema = new Schema({
    referrer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referred: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'REWARDED'],
        default: 'PENDING'
    },
    rewardAmount: {
        type: Number,
        default: 0
    },
    referredAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
}, { timestamps: true });


const ReferralOffer = mongoose.model("ReferralOffer", referralOfferSchema);
module.exports = ReferralOffer;
