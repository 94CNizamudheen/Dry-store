const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null,
    },
    googleId: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    cart: [
        {
            type: Schema.Types.ObjectId,
            ref: "cart",
        },
    ],
    wallet: {
        balance: {
            type: Number,
            default: 0,
        },
        transaction: [
            {
                type: {
                    type: String,
                    enum: ["credit", "debit"],
                },
                amount: Number,
                date: {
                    type: Date,
                    default: Date.now,
                },
                description: String,
             
            },
        ],
    },
    rewardPoints:{
        type:Number,
        default:0,
    },

    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "Wishlist",
        },
    ],
    orderHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Order",
        },
    ],
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    totalReferrals: {
        type: Number,
        default: 0
    },
    referralRewards: {
        type: Number,
        default: 0
    },
    redeemed: {
        type: Boolean,
    },
    redeemedUsers: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    searchHistory: [
        {
            category: {
                type: Schema.Types.ObjectId,
                ref: "Category",
            },
            brand: {
                type: String,
            },
            searchOn: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
