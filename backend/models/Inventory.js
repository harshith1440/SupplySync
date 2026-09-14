const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    barcode: {
      type: String,
      trim: true,
      default: null,
    },

    brand: {
      type: String,
      trim: true,
      default: null,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      trim: true,
      default: "piece",
    },

    batchNumber: {
      type: String,
      trim: true,
      default: null,
    },

    manufacturingDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    purchasePrice: {
      type: Number,
      min: 0,
      default: null,
    },

    sellingPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    // Kept temporarily for compatibility with existing products.
    price: {
      type: Number,
      min: 0,
      default: null,
    },

    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },

    supplierName: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// SKU should be unique inside an organization
inventorySchema.index(
  { organizationId: 1, sku: 1 },
  { unique: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);