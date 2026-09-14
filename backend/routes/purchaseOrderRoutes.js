const express = require("express");
const { getAuth } = require("@clerk/express");

const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");

const requireRole = require("../middleware/requireRole");

const router = express.Router();

/*
========================================================
CREATE PURCHASE ORDER
========================================================

POST /api/purchase-orders

Expected body:

{
  "supplierId": "...",
  "items": [
    {
      "sku": "ATTA-5KG",
      "quantity": 20
    },
    {
      "sku": "MK001",
      "quantity": 30
    }
  ]
}

One supplier can have multiple products
inside one purchase order.
*/

router.post(
  "/",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const { supplierId, items } = req.body;

      if (!supplierId) {
        return res.status(400).json({
          message: "Supplier ID is required",
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message:
            "At least one item is required",
        });
      }

      /*
      --------------------------------------------------
      FIND SUPPLIER
      --------------------------------------------------
      */

      const supplier = await Supplier.findOne({
        _id: supplierId,
        organizationId: auth.orgId,
        active: true,
      }).lean();

      if (!supplier) {
        return res.status(404).json({
          message:
            "Active supplier not found",
        });
      }

      /*
      --------------------------------------------------
      PREVENT DUPLICATE SKUs
      --------------------------------------------------
      */

      const normalizedItems = items.map(
        (item) => ({
          sku: String(item.sku || "")
            .trim()
            .toUpperCase(),

          quantity: Number(item.quantity),
        })
      );

      const skuSet = new Set();

      for (const item of normalizedItems) {
        if (!item.sku) {
          return res.status(400).json({
            message:
              "Every item must have a SKU",
          });
        }

        if (
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          return res.status(400).json({
            message:
              `Invalid quantity for SKU ${item.sku}`,
          });
        }

        if (skuSet.has(item.sku)) {
          return res.status(400).json({
            message:
              `Duplicate SKU ${item.sku} found in purchase order`,
          });
        }

        skuSet.add(item.sku);
      }

      /*
      --------------------------------------------------
      BUILD PURCHASE ORDER ITEMS
      --------------------------------------------------
      */

      const purchaseOrderItems = [];

      for (const requestedItem of normalizedItems) {
        /*
        Find product inside supplier catalog
        */
        const supplierProduct =
          supplier.products.find(
            (product) =>
              product.sku === requestedItem.sku
          );

        if (!supplierProduct) {
          return res.status(400).json({
            message:
              `Supplier does not supply SKU ${requestedItem.sku}`,
          });
        }

        /*
        MOQ validation
        */

        if (
          requestedItem.quantity <
          supplierProduct.minimumOrderQuantity
        ) {
          return res.status(400).json({
            message:
              `Minimum order quantity for ${requestedItem.sku} is ${supplierProduct.minimumOrderQuantity}`,
          });
        }

        /*
        Supplier availability validation
        */

        if (
          requestedItem.quantity >
          supplierProduct.availableQuantity
        ) {
          return res.status(400).json({
            message:
              `Only ${supplierProduct.availableQuantity} units of ${requestedItem.sku} are available`,
          });
        }

        /*
        Find retailer inventory
        */

        const inventory =
          await Inventory.findOne({
            organizationId: auth.orgId,
            sku: requestedItem.sku,
          }).lean();

        if (!inventory) {
          return res.status(404).json({
            message:
              `Inventory not found for SKU ${requestedItem.sku}`,
          });
        }

        /*
        Calculate item total on backend.
        Never trust frontend price calculations.
        */

        const totalPrice =
          requestedItem.quantity *
          supplierProduct.unitPrice;

        purchaseOrderItems.push({
          inventoryId: inventory._id,

          sku: supplierProduct.sku,

          productName:
            supplierProduct.productName,

          unit: inventory.unit,

          quantity:
            requestedItem.quantity,

          unitPrice:
            supplierProduct.unitPrice,

          totalPrice,
        });
      }

      /*
      --------------------------------------------------
      CALCULATE TOTAL
      --------------------------------------------------
      */

      const subtotal =
        purchaseOrderItems.reduce(
          (total, item) =>
            total + item.totalPrice,
          0
        );

      const roundedSubtotal =
        Number(subtotal.toFixed(2));

      /*
      --------------------------------------------------
      CREATE PURCHASE ORDER
      --------------------------------------------------
      */

      const purchaseOrder =
        await PurchaseOrder.create({
          organizationId: auth.orgId,

          supplierId: supplier._id,

          supplierName:
            supplier.supplierName,

          items: purchaseOrderItems,

          subtotal: roundedSubtotal,

          totalAmount: roundedSubtotal,

          orderStatus: "pending",

          paymentStatus: "pending",
        });

      return res.status(201).json({
        message:
          "Purchase order created successfully",

        purchaseOrder,
      });
    } catch (error) {
      console.error(
        "Create purchase order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create purchase order",
      });
    }
  }
);

/*
========================================================
GET ALL PURCHASE ORDERS
========================================================

GET /api/purchase-orders
*/

router.get(
  "/",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const purchaseOrders =
        await PurchaseOrder.find({
          organizationId: auth.orgId,
        })
          .populate(
            "supplierId",
            "supplierName email phone"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        message:
          "Purchase orders fetched successfully",

        count: purchaseOrders.length,

        purchaseOrders,
      });
    } catch (error) {
      console.error(
        "Fetch purchase orders error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch purchase orders",
      });
    }
  }
);

/*
========================================================
GET SINGLE PURCHASE ORDER
========================================================

GET /api/purchase-orders/:id
*/

router.get(
  "/:id",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const purchaseOrder =
        await PurchaseOrder.findOne({
          _id: req.params.id,
          organizationId: auth.orgId,
        })
          .populate(
            "supplierId",
            "supplierName email phone contactPerson"
          )
          .populate(
            "items.inventoryId",
            "productName sku category unit"
          )
          .lean();

      if (!purchaseOrder) {
        return res.status(404).json({
          message:
            "Purchase order not found",
        });
      }

      return res.status(200).json({
        message:
          "Purchase order fetched successfully",

        purchaseOrder,
      });
    } catch (error) {
      console.error(
        "Fetch purchase order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch purchase order",
      });
    }
  }
);

module.exports = router;