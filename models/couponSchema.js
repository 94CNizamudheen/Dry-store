const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true, 
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiryOn: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > Date.now();
      },
      message: "Expiry date must be in the future",
    },
  },
  updatedOn: {
    type: Date,
    default: Date.now,
  },
  discountType: {
    type: String,
    enum: ["percentage", "flat"], 
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: [0, "Discount value must be non-negative"],
  },
  minimumPrice: {
    type: Number,
    min: [0, "Minimum price cannot be negative"],
  },
  isList: {
    type: Boolean,
    default: true,
  },
  usageLimit: {
    type: Number,
    default: 1,
    min: [1, "Usage limit must be at least 1"],
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: [0, "Times used cannot be negative"],
  },
  userId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

// Virtual field for checking if the coupon is expired
couponSchema.virtual("isExpired").get(function () {
  return this.expiryOn < Date.now();
});

// Pre-save hook for updating the updatedOn field
couponSchema.pre("save", function (next) {
  this.updatedOn = Date.now();
  next();
});

// Query helper for active coupons
couponSchema.query.active = function () {
  return this.find({ expiryOn: { $gt: Date.now() }, isList: true });
};

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
