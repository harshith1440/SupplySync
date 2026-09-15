const mongoose = require("mongoose");

const supplierFeedbackSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      unique: true,
    },
    retailerUserId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupplierFeedback", supplierFeedbackSchema);