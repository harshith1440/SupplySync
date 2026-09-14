const mongoose = require("mongoose");

const forecastFeatureSchema = new mongoose.Schema(
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

    saleDate: {
      type: Date,
      required: true,
      index: true,
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
      required: true,
      min: 0,
    },

    promotion: {
      type: Boolean,
      default: false,
    },

    festival: {
      type: String,
      trim: true,
      default: null,
    },

    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    dayOfMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    weekOfYear: {
      type: Number,
      required: true,
      min: 1,
      max: 53,
    },

    isWeekend: {
      type: Boolean,
      required: true,
    },

    lag1: {
      type: Number,
      required: true,
      min: 0,
    },

    lag7: {
      type: Number,
      required: true,
      min: 0,
    },

    lag14: {
      type: Number,
      required: true,
      min: 0,
    },

    lag30: {
      type: Number,
      required: true,
      min: 0,
    },

    rolling7Average: {
      type: Number,
      required: true,
      min: 0,
    },

    rolling14Average: {
      type: Number,
      required: true,
      min: 0,
    },

    rolling30Average: {
      type: Number,
      required: true,
      min: 0,
    },

    rolling7StdDev: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

forecastFeatureSchema.index(
  {
    organizationId: 1,
    sku: 1,
    saleDate: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "ForecastFeature",
  forecastFeatureSchema
);