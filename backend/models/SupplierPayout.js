const mongoose = require("mongoose");

const supplierPayoutSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },

    poNumber: {
      type: String,
      required: true,
      trim: true,
    },

    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    payoutStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "failed",
        "reversed",
      ],
      default: "pending",
      index: true,
    },

    payoutMethod: {
      type: String,
      enum: [
        "manual",
        "bank_transfer",
        "razorpay",
        "simulated",
      ],
      default: "simulated",
    },

    referenceId: {
      type: String,
      trim: true,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supplierPayoutSchema.index({
  organizationId: 1,
  supplierId: 1,
  createdAt: -1,
});

supplierPayoutSchema.index({
  organizationId: 1,
  payoutStatus: 1,
});

supplierPayoutSchema.index({
  organizationId: 1,
  purchaseOrderId: 1,
});

supplierPayoutSchema.index({
  organizationId: 1,
  paymentTransactionId: 1,
});

module.exports = mongoose.model(
  "SupplierPayout",
  supplierPayoutSchema
);