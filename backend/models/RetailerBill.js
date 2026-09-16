const mongoose = require("mongoose");

const retailerBillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => `BILL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    organizationId: { type: String, required: true, index: true },
    retailerUserId: { type: String, required: true, index: true },
    purchaseOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true }],
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["OPEN", "PAID", "OVERDUE"],
      default: "OPEN",
      index: true,
    },
    paidAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null, trim: true, index: true },
    razorpayPaymentId: { type: String, default: null, trim: true },
    razorpaySignature: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

retailerBillSchema.index({ organizationId: 1, retailerUserId: 1, createdAt: -1 });

module.exports = mongoose.model("RetailerBill", retailerBillSchema);