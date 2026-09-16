const express = require("express");
const {
  getAuth,
  clerkClient,
} = require("@clerk/express");

const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const RetailerProfile = require("../models/RetailerProfile");
const SupplierFeedback = require("../models/SupplierFeedback");
const { receivePurchaseOrder } = require("../services/receivePurchaseOrder");

const requireRole = require("../middleware/requireRole");
const { isRetailerAdmin } = require("../middleware/retailerScope");

const router = express.Router();

function buildSupplierSnapshot(supplier) {
  const address = supplier.address || {};
  return {
    businessName: supplier.businessName || supplier.supplierName || null,
    supplierName: supplier.supplierName || null,
    contactPerson: supplier.contactPerson || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    addressLine1: supplier.addressLine1 || address.addressLine1 || address.line1 || null,
    addressLine2: supplier.addressLine2 || address.addressLine2 || address.line2 || null,
    city: supplier.city || address.city || null,
    state: supplier.state || address.state || null,
    pincode: supplier.pincode || address.pincode || address.postalCode || null,
    country: supplier.country || address.country || null,
  };
}

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
    }
  ]
}
*/

router.post(
  "/",
  requireRole("org:retailer", "org:retailer_admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      if (!auth.userId) {
        return res.status(400).json({
          message: "Retailer user not found",
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
      GET RETAILER DETAILS FROM CLERK
      --------------------------------------------------
      */

      let retailerName = null;
      let retailerEmail = null;
      let retailerPhone = null;
      let retailerAddress = null;

      const retailerProfile = await RetailerProfile.findOne({
        organizationId: auth.orgId,
        clerkUserId: auth.userId,
      }).lean();

      if (!retailerProfile || retailerProfile.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Retailer account is pending admin approval and cannot create purchase orders yet.",
          approvalStatus: retailerProfile?.approvalStatus || "PENDING",
        });
      }

      retailerName = retailerProfile?.businessName || retailerProfile?.name || null;
      retailerEmail = retailerProfile?.email || null;
      retailerPhone = retailerProfile?.phone || null;
      retailerAddress = retailerProfile?.address || null;

      const deliveryAddress = {
        businessName: retailerProfile?.businessName || retailerProfile?.address?.businessName || retailerProfile?.name || null,
        contactPerson: retailerProfile?.contactPerson || retailerProfile?.address?.contactPerson || retailerProfile?.name || null,
        phone: retailerProfile?.phone || retailerProfile?.address?.phone || null,
        addressLine1: retailerProfile?.address?.addressLine1 || retailerProfile?.address?.line1 || null,
        addressLine2: retailerProfile?.address?.addressLine2 || retailerProfile?.address?.line2 || null,
        city: retailerProfile?.address?.city || null,
        state: retailerProfile?.address?.state || null,
        pincode: retailerProfile?.address?.pincode || retailerProfile?.address?.postalCode || null,
        country: retailerProfile?.address?.country || "India",
      };

      const requiredAddressFields = [
        "businessName",
        "contactPerson",
        "phone",
        "addressLine1",
        "city",
        "state",
        "pincode",
        "country",
      ];
      if (requiredAddressFields.some((field) => !deliveryAddress[field])) {
        return res.status(400).json({ message: "A complete saved delivery address is required before creating a purchase order" });
      }

      try {
        const retailer =
          await clerkClient.users.getUser(
            auth.userId
          );

        retailerName = retailerName || retailer.fullName || retailer.username || null;
        retailerEmail = retailerEmail || retailer.primaryEmailAddress?.emailAddress || null;
      } catch (clerkError) {
        console.error(
          "Fetch retailer details from Clerk error:",
          clerkError
        );

        /*
        Do not fail PO creation only because
        retailer display information could not
        be fetched.
        */
      }

      /*
      --------------------------------------------------
      FIND SUPPLIER
      --------------------------------------------------
      */

      const supplier = await Supplier.findOne({
        _id: supplierId,
        active: true,
        approvalStatus: "APPROVED",
        products: {
          $elemMatch: {
            active: { $ne: false },
            availableQuantity: { $gt: 0 },
          },
        },
      }).lean();

      if (!supplier) {
        const supplierRecord = await Supplier.findById(supplierId).lean();

        if (supplierRecord && supplierRecord.approvalStatus !== "APPROVED") {
          return res.status(403).json({
            message: "Supplier is pending approval and cannot receive purchase orders yet.",
          });
        }

        return res.status(404).json({
          message:
            "Active approved supplier not found",
        });
      }

      /*
      --------------------------------------------------
      NORMALIZE ITEMS
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
              product.sku === requestedItem.sku &&
              product.active !== false
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
        Calculate item total on backend
        */

        const totalPrice =
          requestedItem.quantity *
          supplierProduct.unitPrice;

        purchaseOrderItems.push({
          inventoryId: null,

          sku: supplierProduct.sku,

          productName:
            supplierProduct.productName,

          category:
            supplierProduct.category,

          brand:
            supplierProduct.brand || null,

          unit: supplierProduct.unit || "piece",

          leadTimeDays:
            supplierProduct.leadTimeDays ?? supplier.leadTimeDays ?? null,

          manufacturingDate: supplierProduct.manufacturingDate,
          expiryDate: supplierProduct.expiryDate,

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

          retailerUserId: auth.userId,

          retailerName,

          retailerEmail,

          retailerPhone,

          retailerAddress,

          deliveryAddress,

          supplierId: supplier._id,

          supplierOrganizationId: supplier.organizationId,

          supplierSnapshot: buildSupplierSnapshot(supplier),

          supplierName:
            supplier.businessName || supplier.supplierName,

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
  requireRole("org:retailer", "org:retailer_admin"),
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
          ...(isRetailerAdmin(auth) ? {} : { retailerUserId: auth.userId }),
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

router.patch(
  "/:id/delivered",
  requireRole("org:retailer", "org:retailer_admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        {
          _id: req.params.id,
          organizationId: auth.orgId,
          retailerUserId: auth.userId,
          orderStatus: { $in: ["confirmed", "shipped"] },
        },
        { $set: { orderStatus: "delivered" } },
        { new: true }
      );

      if (!purchaseOrder) {
        return res.status(404).json({
          message: "Purchase order is not ready to mark as delivered",
        });
      }

      return res.status(200).json({ purchaseOrder });
    } catch (error) {
      console.error("Mark purchase order delivered error:", error);
      return res.status(500).json({ message: "Failed to mark order as delivered" });
    }
  }
);

router.post(
  "/:id/receive",
  requireRole("org:retailer", "org:retailer_admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: req.params.id,
        organizationId: auth.orgId,
        retailerUserId: auth.userId,
        orderStatus: { $ne: "cancelled" },
      });

      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const result = await receivePurchaseOrder(purchaseOrder._id);
      const updatedPurchaseOrder = await PurchaseOrder.findById(purchaseOrder._id);
      return res.status(200).json({ purchaseOrder: updatedPurchaseOrder, ...result });
    } catch (error) {
      console.error("Receive purchase order error:", error);
      return res.status(400).json({ message: error.message || "Failed to receive purchase order" });
    }
  }
);

router.post(
  "/:id/feedback",
  requireRole("org:retailer", "org:retailer_admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const rating = Number(req.body.rating);

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be an integer from 1 to 5" });
      }

      const purchaseOrder = await PurchaseOrder.findOne({
        _id: req.params.id,
        organizationId: auth.orgId,
        retailerUserId: auth.userId,
        supplierId: { $ne: null },
        orderStatus: "delivered",
      });

      if (!purchaseOrder) {
        return res.status(404).json({ message: "Delivered purchase order not found" });
      }

      const feedback = await SupplierFeedback.create({
        organizationId: auth.orgId,
        supplierId: purchaseOrder.supplierId,
        purchaseOrderId: purchaseOrder._id,
        retailerUserId: auth.userId,
        rating,
        comment: req.body.comment || null,
      });

      const aggregate = await SupplierFeedback.aggregate([
        { $match: { supplierId: purchaseOrder.supplierId } },
        { $group: { _id: "$supplierId", averageRating: { $avg: "$rating" } } },
      ]);

      await Supplier.findByIdAndUpdate(purchaseOrder.supplierId, {
        $set: { rating: Number((aggregate[0]?.averageRating || 0).toFixed(2)) },
      });

      return res.status(201).json({ feedback });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Feedback was already submitted for this order" });
      }
      console.error("Submit supplier feedback error:", error);
      return res.status(500).json({ message: "Failed to submit supplier feedback" });
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
  requireRole("org:retailer", "org:retailer_admin"),
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
          ...(isRetailerAdmin(auth) ? {} : { retailerUserId: auth.userId }),
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