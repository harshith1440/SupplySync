const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    retailerUserId: {
      type: String,
      default: null,
      index: true,
    },

    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
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

    category: {
      type: String,
      required: true,
      trim: true,
    },

    quantitySold: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    festival: {
      type: String,
      trim: true,
      default: null,
    },

    promotion: {
      type: Boolean,
      default: false,
    },

    saleDate: {
      type: Date,
      required: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },

    isSynthetic: {
      type: Boolean,
      default: false,
      index: true,
    },

    syntheticSource: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index(
  {
    organizationId: 1,
    retailerUserId: 1,
    sku: 1,
    saleDate: 1,
  },
  { unique: false }
);

saleSchema.index(
  {
    organizationId: 1,
    retailerUserId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Sale", saleSchema);