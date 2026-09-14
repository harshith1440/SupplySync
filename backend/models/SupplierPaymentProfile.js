const mongoose = require("mongoose");

const supplierPaymentProfileSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      unique: true,
      index: true,
    },

    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    razorpayAccountId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    razorpayAccountStatus: {
      type: String,
      enum: [
        "created",
        "suspended",
        "unknown",
      ],
      default: "created",
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    legalBusinessName: {
      type: String,
      required: true,
      trim: true,
    },

    customerFacingBusinessName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

supplierPaymentProfileSchema.index({
  organizationId: 1,
  supplierId: 1,
});

module.exports = mongoose.model(
  "SupplierPaymentProfile",
  supplierPaymentProfileSchema
);