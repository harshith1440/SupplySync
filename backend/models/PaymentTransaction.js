const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    retailerUserId: {
      type: String,
      required: true,
      index: true,
    },

    retailerName: { type: String, trim: true, default: null },
    retailerEmail: { type: String, trim: true, lowercase: true, default: null },
    retailerPhone: { type: String, trim: true, default: null },
    retailerAddress: { type: mongoose.Schema.Types.Mixed, default: null },
    deliveryAddress: { type: mongoose.Schema.Types.Mixed, default: null },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
      index: true,
    },

    supplierOrganizationId: {
      type: String,
      required: false,
      index: true,
    },

    supplierName: {
      type: String,
      required: false,
      trim: true,
    },

    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: false,
      index: true,
    },

    poNumber: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RetailerBill",
      default: null,
      index: true,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    transferStatus: {
      type: String,
      enum: [
        "not_started",
        "pending",
        "processed",
        "failed",
        "reversed",
        "partially_reversed",
      ],
      default: "not_started",
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
      trim: true,
    },

    razorpayTransferId: {
      type: String,
      default: null,
      trim: true,
    },

    failureReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({
  organizationId: 1,
  retailerUserId: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  supplierId: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  supplierOrganizationId: 1,
  supplierId: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  organizationId: 1,
  paymentStatus: 1,
});

paymentTransactionSchema.index({
  organizationId: 1,
  transferStatus: 1,
});

module.exports = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema
);