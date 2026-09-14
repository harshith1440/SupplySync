const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
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

    unit: {
      type: String,
      trim: true,
      default: "piece",
    },

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

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
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