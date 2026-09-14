const mongoose = require("mongoose");

const supplierProductSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    minimumOrderQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const supplierSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: null,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    products: {
      type: [supplierProductSchema],
      required: true,
      default: [],
    },

    leadTimeDays: {
      type: Number,
      required: true,
      min: 0,
    },

    reliabilityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({
  organizationId: 1,
  supplierName: 1,
});

module.exports = mongoose.model(
  "Supplier",
  supplierSchema
);