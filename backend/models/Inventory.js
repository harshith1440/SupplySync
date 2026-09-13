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

    category: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
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