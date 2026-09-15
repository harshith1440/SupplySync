const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      default: null,
    },

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
      trim: true,
      default: null,
    },

    brand: {
      type: String,
      trim: true,
      default: null,
    },

    unit: {
      type: String,
      trim: true,
      default: "piece",
    },

    leadTimeDays: {
      type: Number,
      min: 0,
      default: null,
    },

    manufacturingDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => {
        const timestamp =
          Date.now().toString().slice(-8);

        const random =
          Math.floor(
            1000 + Math.random() * 9000
          );

        return `PO-${timestamp}-${random}`;
      },
    },

    organizationId: {
      type: String,
      required: true,
      index: true,
    },

    /*
    ------------------------------------------------------
    RETAILER DETAILS
    ------------------------------------------------------
    */

    retailerUserId: {
      type: String,
      required: true,
      index: true,
    },

    retailerName: {
      type: String,
      trim: true,
      default: null,
    },

    retailerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    retailerPhone: {
      type: String,
      trim: true,
      default: null,
    },

    retailerAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    deliveryAddress: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    /*
    ------------------------------------------------------
    SUPPLIER DETAILS
    ------------------------------------------------------
    */

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    supplierOrganizationId: {
      type: String,
      default: null,
      index: true,
    },

    supplierSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [purchaseOrderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length > 0
          );
        },
        message:
          "Purchase order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    orderStatus: {
      type: String,
      enum: [
        "draft",
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
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

    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },

    razorpaySignature: {
      type: String,
      trim: true,
      default: null,
    },

    inventoryUpdatedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
========================================================
INDEXES
========================================================
*/

purchaseOrderSchema.index({
  organizationId: 1,
  supplierId: 1,
  createdAt: -1,
});

purchaseOrderSchema.index({
  supplierOrganizationId: 1,
  supplierId: 1,
  createdAt: -1,
});

purchaseOrderSchema.index({
  organizationId: 1,
  retailerUserId: 1,
  createdAt: -1,
});

purchaseOrderSchema.index({
  organizationId: 1,
  orderStatus: 1,
});

purchaseOrderSchema.index({
  organizationId: 1,
  paymentStatus: 1,
});

module.exports = mongoose.model(
  "PurchaseOrder",
  purchaseOrderSchema
);