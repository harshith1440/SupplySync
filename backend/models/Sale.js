const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate daily sales records
// for the same product within an organization.
saleSchema.index(
  {
    organizationId: 1,
    sku: 1,
    saleDate: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Sale", saleSchema);