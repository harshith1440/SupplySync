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

    active: {
      type: Boolean,
      default: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    organizationId: {
      type: String,
      default: null,
    },

    leadTimeDays: {
      type: Number,
      min: 0,
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

    // Clerk user ID of the supplier account.
    // Optional so existing supplier documents continue to work
    // until they are explicitly mapped to a supplier login.
    clerkUserId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    businessName: {
      type: String,
      trim: true,
      default: null,
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

    addressLine1: { type: String, trim: true, default: null },
    addressLine2: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    pincode: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },

    address: {
      type: mongoose.Schema.Types.Mixed,
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
      default: 0,
      min: 0,
    },

    reliabilityScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },

    rating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },

    active: {
      type: Boolean,
      default: true,
    },

    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    approvalReason: {
      type: String,
      trim: true,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
      index: true,
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

supplierSchema.index(
  {
    organizationId: 1,
    clerkUserId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      clerkUserId: {
        $type: "string",
      },
    },
  }
);

module.exports = mongoose.model(
  "Supplier",
  supplierSchema
);