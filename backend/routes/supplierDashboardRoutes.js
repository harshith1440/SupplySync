const express = require("express");
const {
  getAuth,
  clerkClient,
} = require("@clerk/express");

const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const PaymentTransaction = require("../models/PaymentTransaction");
const SupplierPayout = require("../models/SupplierPayout");
const SupplierFeedback = require("../models/SupplierFeedback");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

/*
========================================================
SUPPLIER DASHBOARD
========================================================

GET /api/supplier-dashboard

The logged-in supplier is identified by:
- Clerk organization ID
- Clerk user ID mapped to Supplier.clerkUserId

Only that supplier's:
- profile
- products
- purchase orders
- payment transactions
- payouts
are returned.
*/

router.get(
  "/",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      /*
      --------------------------------------------------
      DISABLE CACHE
      --------------------------------------------------
      */
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      const auth = getAuth(req);

      const organizationId = auth.orgId;
      const clerkUserId = auth.userId;

      if (!organizationId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      if (!clerkUserId) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      /*
      --------------------------------------------------
      FIND LOGGED-IN SUPPLIER
      --------------------------------------------------
      */

      const supplier =
        await Supplier.findOne({
          organizationId,
          clerkUserId,
          active: true,
        }).lean();

      if (!supplier) {
        return res.status(404).json({
          message:
            "No active supplier profile is linked to this account",
        });
      }

      const supplierId = supplier._id;

      const supplierOrders = await PurchaseOrder.find({
        supplierOrganizationId: organizationId,
        supplierId,
        orderStatus: { $ne: "cancelled" },
      }).select("paymentStatus orderStatus inventoryUpdatedAt").lean();

      const metricPaidOrders = supplierOrders.filter((order) => order.paymentStatus === "paid");
      const completedOrders = metricPaidOrders.filter((order) =>
        order.inventoryUpdatedAt || ["confirmed", "shipped", "delivered"].includes(order.orderStatus)
      );
      const reliabilityScore = metricPaidOrders.length
        ? Number(((completedOrders.length / metricPaidOrders.length) * 100).toFixed(2))
        : 0;

      const ratingAggregate = await SupplierFeedback.aggregate([
        { $match: { supplierId } },
        { $group: { _id: "$supplierId", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]);
      const qualityRating = Number((ratingAggregate[0]?.averageRating || 0).toFixed(2));

      /*
      --------------------------------------------------
      SYNC PAID ORDERS
      --------------------------------------------------

      If paymentStatus is paid, the order must be confirmed.

      This:
      1. Fixes older records
      2. Keeps future dashboard data consistent
      3. Updates MongoDB itself
      --------------------------------------------------
      */

      await PurchaseOrder.updateMany(
        {
          supplierOrganizationId: organizationId,
          supplierId,
          paymentStatus: "paid",
          orderStatus: {
            $in: ["pending", "draft"],
          },
        },
        {
          $set: {
            orderStatus: "confirmed",
          },
        }
      );

      /*
      --------------------------------------------------
      FETCH ORDERS, PAYMENTS, PAYOUTS
      --------------------------------------------------
      */

      const [
        purchaseOrders,
        payments,
        payouts,
      ] = await Promise.all([
        PurchaseOrder.find({
          supplierOrganizationId: organizationId,
          supplierId,
        })
          .sort({
            createdAt: -1,
          })
          .lean(),

        PaymentTransaction.find({
          supplierOrganizationId: organizationId,
          supplierId,
        })
          .sort({
            createdAt: -1,
          })
          .lean(),

        SupplierPayout.find({
          supplierOrganizationId: organizationId,
          supplierId,
        })
          .sort({
            createdAt: -1,
          })
          .lean(),
      ]);

      /*
      --------------------------------------------------
      BUILD FALLBACK RETAILER MAP
      --------------------------------------------------

      Older purchase orders may not contain
      retailerUserId.

      PaymentTransaction does contain retailerUserId,
      so use it as fallback.
      --------------------------------------------------
      */

      const retailerIdByPurchaseOrder =
        new Map();

      for (const payment of payments) {
        if (
          payment.purchaseOrderId &&
          payment.retailerUserId
        ) {
          retailerIdByPurchaseOrder.set(
            String(payment.purchaseOrderId),
            payment.retailerUserId
          );
        }
      }

      /*
      --------------------------------------------------
      BUILD UNIQUE RETAILER ID LIST
      --------------------------------------------------
      */

      const retailerIds = [
        ...new Set(
          purchaseOrders
            .map(
              (order) =>
                order.retailerUserId ||
                retailerIdByPurchaseOrder.get(
                  String(order._id)
                )
            )
            .filter(Boolean)
        ),
      ];

      /*
      --------------------------------------------------
      FETCH RETAILER DETAILS FROM CLERK
      --------------------------------------------------
      */

      const retailerDetailsMap = new Map();

      await Promise.all(
        retailerIds.map(async (retailerId) => {
          try {
            const retailer =
              await clerkClient.users.getUser(
                retailerId
              );

            retailerDetailsMap.set(
              retailerId,
              {
                userId: retailerId,

                name:
                  retailer.fullName ||
                  retailer.username ||
                  retailer.primaryEmailAddress
                    ?.emailAddress ||
                  retailerId,

                email:
                  retailer.primaryEmailAddress
                    ?.emailAddress || null,
              }
            );
          } catch (error) {
            console.error(
              `Failed to fetch retailer ${retailerId}:`,
              error
            );

            retailerDetailsMap.set(
              retailerId,
              {
                userId: retailerId,
                name: retailerId,
                email: null,
              }
            );
          }
        })
      );

      /*
      --------------------------------------------------
      ENRICH PURCHASE ORDERS
      --------------------------------------------------
      */

      const enrichedPurchaseOrders =
        purchaseOrders.map((order) => {
          const fallbackRetailerId =
            retailerIdByPurchaseOrder.get(
              String(order._id)
            );

          const resolvedRetailerUserId =
            order.retailerUserId ||
            fallbackRetailerId ||
            null;

          const clerkRetailer =
            resolvedRetailerUserId
              ? retailerDetailsMap.get(
                  resolvedRetailerUserId
                )
              : null;

          return {
            ...order,

            retailerUserId:
              resolvedRetailerUserId,

            retailerName:
              order.retailerName ||
              clerkRetailer?.name ||
              null,

            retailerEmail:
              order.retailerEmail ||
              clerkRetailer?.email ||
              null,

            retailerPhone: order.retailerPhone || null,
            retailerAddress: order.retailerAddress || null,
            deliveryAddress: order.deliveryAddress || order.retailerAddress || null,
          };
        });

      /*
      --------------------------------------------------
      SUMMARY
      --------------------------------------------------
      */

      const totalOrders =
        enrichedPurchaseOrders.length;

      const paidOrders =
        enrichedPurchaseOrders.filter(
          (order) =>
            order.paymentStatus === "paid"
        ).length;

      const pendingOrders =
        enrichedPurchaseOrders.filter(
          (order) =>
            order.paymentStatus !== "paid"
        ).length;

      const totalOrderValue =
        enrichedPurchaseOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.totalAmount || 0
            ),
          0
        );

      const totalPaidValue =
        payments
          .filter(
            (payment) =>
              payment.paymentStatus === "paid"
          )
          .reduce(
            (sum, payment) =>
              sum +
              Number(payment.amount || 0),
            0
          );

      const pendingPayoutValue =
        payouts
          .filter(
            (payout) =>
              payout.payoutStatus ===
                "pending" ||
              payout.payoutStatus ===
                "processing"
          )
          .reduce(
            (sum, payout) =>
              sum +
              Number(payout.amount || 0),
            0
          );

      const completedPayoutValue =
        payouts
          .filter(
            (payout) =>
              payout.payoutStatus === "paid"
          )
          .reduce(
            (sum, payout) =>
              sum +
              Number(payout.amount || 0),
            0
          );

      /*
      --------------------------------------------------
      UNIQUE RETAILERS
      --------------------------------------------------
      */

      const uniqueRetailers = [
        ...new Set(
          enrichedPurchaseOrders
            .map(
              (order) =>
                order.retailerUserId
            )
            .filter(Boolean)
        ),
      ];

      /*
      --------------------------------------------------
      RESPONSE
      --------------------------------------------------
      */

      return res.status(200).json({
        message:
          "Supplier dashboard fetched successfully",

        supplier: {
          id: supplier._id,

          supplierName:
            supplier.supplierName,

            businessName:
              supplier.businessName || supplier.supplierName,

          contactPerson:
            supplier.contactPerson,

          email:
            supplier.email,

          phone:
            supplier.phone,

          address:
            supplier.address,

          addressLine1: supplier.addressLine1 || supplier.address?.addressLine1 || supplier.address?.line1 || null,
          addressLine2: supplier.addressLine2 || supplier.address?.addressLine2 || supplier.address?.line2 || null,
          city: supplier.city || supplier.address?.city || null,
          state: supplier.state || supplier.address?.state || null,
          pincode: supplier.pincode || supplier.address?.pincode || supplier.address?.postalCode || null,
          country: supplier.country || supplier.address?.country || null,
          description: supplier.description || null,

          products:
            supplier.products || [],

          leadTimeDays:
            supplier.leadTimeDays,

          reliabilityScore:
            reliabilityScore,

          rating:
            qualityRating,

          ratingCount:
            ratingAggregate[0]?.count || 0,

          active:
            supplier.active,
        },

        summary: {
          totalProducts:
            (supplier.products || [])
              .length,

          totalOrders,

          paidOrders,

          pendingOrders,

          totalRetailers:
            uniqueRetailers.length,

          totalOrderValue,

          totalPaidValue,

          pendingPayoutValue,

          completedPayoutValue,
        },

        purchaseOrders:
          enrichedPurchaseOrders,

        payments,

        payouts,
      });
    } catch (error) {
      console.error(
        "Supplier dashboard error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch supplier dashboard",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;