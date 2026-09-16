const express = require("express");
const mongoose = require("mongoose");
const { getAuth, clerkClient } = require("@clerk/express");

const PaymentTransaction = require("../models/PaymentTransaction");
const SupplierPayout = require("../models/SupplierPayout");
const PurchaseOrder = require("../models/PurchaseOrder");
const RetailerProfile = require("../models/RetailerProfile");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const Sale = require("../models/Sale");

const requireRole = require("../middleware/requireRole");
const { getRazorpayInstance } = require("../services/razorpayService");

const router = express.Router();

/*
========================================================
ADMIN TRANSACTION MONITORING
========================================================

GET /api/admin/transactions

Returns:
- payment transactions
- supplier payout status
- retailer details
- supplier details
- purchase order details
- summary statistics

Admin only.
*/

router.get(
  "/",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      const organizationId = auth.orgId;

      if (!organizationId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      await PurchaseOrder.updateMany(
        {
          organizationId,
          paymentStatus: "paid",
          orderStatus: { $in: ["draft", "pending"] },
        },
        { $set: { orderStatus: "confirmed" } }
      );

      /*
      --------------------------------------------------
      FETCH PAYMENT TRANSACTIONS
      --------------------------------------------------
      */

      const payments =
        await PaymentTransaction.find({
          organizationId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      /*
      --------------------------------------------------
      FETCH RELATED PAYOUTS
      --------------------------------------------------
      */

      const payouts =
        await SupplierPayout.find({
          organizationId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      /*
      --------------------------------------------------
      FETCH PURCHASE ORDERS
      --------------------------------------------------
      */

      const purchaseOrders =
        await PurchaseOrder.find({
          organizationId,
        })
          .select(
            "_id poNumber retailerUserId retailerName retailerEmail retailerPhone retailerAddress deliveryAddress supplierId supplierOrganizationId supplierName totalAmount orderStatus paymentStatus createdAt"
          )
          .lean();

      /*
      --------------------------------------------------
      MAP DATA
      --------------------------------------------------
      */

      const payoutByPaymentTransactionId =
        new Map();

      for (const payout of payouts) {
        payoutByPaymentTransactionId.set(
          String(payout.paymentTransactionId),
          payout
        );
      }

      const purchaseOrderById =
        new Map();

      for (const purchaseOrder of purchaseOrders) {
        purchaseOrderById.set(
          String(purchaseOrder._id),
          purchaseOrder
        );
      }

      /*
      --------------------------------------------------
      FIND RETAILER IDS
      --------------------------------------------------
      */

      const retailerIds = [
        ...new Set(
          [
            ...payments.map(
              (payment) =>
                payment.retailerUserId
            ),
            ...purchaseOrders.map(
              (order) =>
                order.retailerUserId
            ),
          ].filter(Boolean)
        ),
      ];

      /*
      --------------------------------------------------
      FETCH RETAILER DETAILS FROM CLERK & DATABASE
      --------------------------------------------------
      */

      const retailerMap = new Map();

      const [retailerProfiles] = await Promise.all([
        RetailerProfile.find({ clerkUserId: { $in: retailerIds } }).lean(),
        ...retailerIds.map(async (retailerId) => {
          try {
            const retailer = await clerkClient.users.getUser(retailerId);
            retailerMap.set(retailerId, {
              userId: retailerId,
              name: retailer.fullName || retailer.username || retailer.primaryEmailAddress?.emailAddress || retailerId,
              email: retailer.primaryEmailAddress?.emailAddress || null,
            });
          } catch (error) {
            retailerMap.set(retailerId, {
              userId: retailerId,
              name: retailerId,
              email: null,
            });
          }
        }),
      ]);

      const retailerProfileMap = new Map(retailerProfiles.map((r) => [r.clerkUserId, r]));

      /*
      --------------------------------------------------
      BUILD TRANSACTION RECORDS
      --------------------------------------------------
      */

      const transactions =
        payments.map((payment) => {
          const purchaseOrder =
            purchaseOrderById.get(
              String(
                payment.purchaseOrderId
              )
            );

          const payout =
            payoutByPaymentTransactionId.get(
              String(payment._id)
            );

          const retailerId =
            payment.retailerUserId ||
            purchaseOrder?.retailerUserId ||
            null;

          const retailer =
            retailerId
              ? retailerMap.get(
                  retailerId
                )
              : null;

          const retailerProfile = retailerId ? retailerProfileMap.get(retailerId) : null;

          return {
            paymentTransactionId:
              payment._id,

            purchaseOrderId:
              payment.purchaseOrderId,

            poNumber:
              payment.poNumber ||
              purchaseOrder?.poNumber ||
              "-",

            retailerUserId:
              retailerId,

            retailerName:
              purchaseOrder?.retailerName ||
              retailerProfile?.businessName ||
              retailerProfile?.name ||
              retailer?.name ||
              retailerId ||
              "-",

            retailerEmail:
              purchaseOrder?.retailerEmail ||
              retailer?.email ||
              null,

            retailerPhone: purchaseOrder?.retailerPhone || null,
            retailerAddress: purchaseOrder?.retailerAddress || null,
            deliveryAddress: purchaseOrder?.deliveryAddress || purchaseOrder?.retailerAddress || null,

            supplierId:
              payment.supplierId,

            supplierOrganizationId:
              payment.supplierOrganizationId ||
              purchaseOrder?.supplierOrganizationId ||
              null,

            supplierName:
              payment.supplierName ||
              purchaseOrder?.supplierName ||
              "-",

            amount:
              payment.amount,

            currency:
              payment.currency,

            paymentStatus:
              payment.paymentStatus,

            transferStatus:
              payment.transferStatus,

            razorpayOrderId:
              payment.razorpayOrderId,

            razorpayPaymentId:
              payment.razorpayPaymentId,

            payout: payout
              ? {
                  id: payout._id,

                  status:
                    payout.payoutStatus,

                  method:
                    payout.payoutMethod,

                  referenceId:
                    payout.referenceId,

                  amount:
                    payout.amount,

                  processedAt:
                    payout.processedAt,
                }
              : null,

            orderStatus:
              purchaseOrder?.orderStatus ||
              "-",

            createdAt:
              payment.createdAt,
          };
        });

      /*
      --------------------------------------------------
      SUMMARY
      --------------------------------------------------
      */

      const totalTransactions =
        transactions.length;

      const paidPayments =
        transactions.filter(
          (transaction) =>
            transaction.paymentStatus ===
            "paid"
        ).length;

      const pendingPayments =
        transactions.filter(
          (transaction) =>
            transaction.paymentStatus ===
            "pending"
        ).length;

      const failedPayments =
        transactions.filter(
          (transaction) =>
            transaction.paymentStatus ===
            "failed"
        ).length;

      const refundedPayments =
        transactions.filter(
          (transaction) =>
            transaction.paymentStatus ===
            "refunded"
        ).length;

      const totalPaymentValue =
        transactions.reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

      const successfulPaymentValue =
        transactions
          .filter(
            (transaction) =>
              transaction.paymentStatus ===
              "paid"
          )
          .reduce(
            (sum, transaction) =>
              sum +
              Number(
                transaction.amount || 0
              ),
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
              Number(
                payout.amount || 0
              ),
            0
          );

      const completedPayoutValue =
        payouts
          .filter(
            (payout) =>
              payout.payoutStatus ===
              "paid"
          )
          .reduce(
            (sum, payout) =>
              sum +
              Number(
                payout.amount || 0
              ),
            0
          );

      return res.status(200).json({
        message:
          "Admin transactions fetched successfully",

        summary: {
          totalTransactions,

          paidPayments,

          pendingPayments,

          failedPayments,

          refundedPayments,

          totalPaymentValue,

          successfulPaymentValue,

          pendingPayoutValue,

          completedPayoutValue,
        },

        transactions,
      });
    } catch (error) {
      console.error(
        "Admin transaction monitoring error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch admin transactions",
      });
    }
  }
);

/*
========================================================
ADMIN SYSTEM HEALTH & DIAGNOSTICS
========================================================

GET /api/admin/transactions/health
or /api/admin/health

Returns:
- API & process diagnostics (uptime, memory, node version)
- Database diagnostics (MongoDB connection state, ping latency, collection counts)
- Payment Gateway diagnostics (Razorpay configuration, ping latency, masked credentials)
- Transaction Monitoring diagnostics (total, paid, pending, failed counts, success rate)
*/
router.get("/health", requireRole("org:admin"), async (req, res) => {
  const startTime = Date.now();
  try {
    // 1. Process / API diagnostics
    const uptimeSeconds = Math.floor(process.uptime());
    const memory = process.memoryUsage();
    const apiHealth = {
      status: "operational",
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || "development",
      memoryUsage: {
        heapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMb: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
        rssMb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    };

    // 2. Database diagnostics (MongoDB)
    let mongoLatencyMs = null;
    let mongoStatus = "disconnected";
    try {
      const dbStart = Date.now();
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        mongoLatencyMs = Date.now() - dbStart;
        mongoStatus = "connected";
      }
    } catch (dbErr) {
      mongoStatus = "error";
      console.error("MongoDB ping error:", dbErr.message);
    }

    // Live Collection counts
    const [
      usersCount,
      suppliersCount,
      retailersCount,
      ordersCount,
      paymentsCount,
      inventoryCount,
      salesCount,
      payoutsCount,
    ] = await Promise.all([
      clerkClient.users.getCount().catch(() => 0),
      Supplier.countDocuments(),
      RetailerProfile.countDocuments(),
      PurchaseOrder.countDocuments(),
      PaymentTransaction.countDocuments(),
      Inventory.countDocuments(),
      Sale.countDocuments(),
      SupplierPayout.countDocuments(),
    ]);

    const databaseHealth = {
      status: mongoStatus,
      host: mongoose.connection.host || "MongoDB Atlas",
      databaseName: mongoose.connection.name || "SupplySync",
      pingLatencyMs: mongoLatencyMs,
      collections: {
        registeredUsers: usersCount,
        suppliers: suppliersCount,
        retailers: retailersCount,
        purchaseOrders: ordersCount,
        paymentTransactions: paymentsCount,
        inventoryItems: inventoryCount,
        salesRecords: salesCount,
        supplierPayouts: payoutsCount,
      },
    };

    // 3. Payment Gateway diagnostics (Razorpay)
    let razorpayHealth = {
      gateway: "Razorpay",
      status: "unknown",
      configured: false,
      keyId: null,
      latencyMs: null,
      mode: "test",
    };

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      razorpayHealth.configured = true;
      razorpayHealth.keyId = `${keyId.substring(0, 8)}...${keyId.substring(keyId.length - 4)}`;
      razorpayHealth.mode = keyId.startsWith("rzp_live") ? "live" : "test";
      try {
        const rzpStart = Date.now();
        const razorpay = getRazorpayInstance();
        await razorpay.payments.all({ count: 1 });
        razorpayHealth.latencyMs = Date.now() - rzpStart;
        razorpayHealth.status = "active";
      } catch (rzpErr) {
        razorpayHealth.status = "error";
        razorpayHealth.error = rzpErr.message;
      }
    } else {
      razorpayHealth.status = "not_configured";
    }

    // 4. Transaction Monitoring diagnostics
    const [paidTx, pendingTx, failedTx, refundedTx, latestTx] = await Promise.all([
      PaymentTransaction.countDocuments({ paymentStatus: "paid" }),
      PaymentTransaction.countDocuments({ paymentStatus: "pending" }),
      PaymentTransaction.countDocuments({ paymentStatus: "failed" }),
      PaymentTransaction.countDocuments({ paymentStatus: "refunded" }),
      PaymentTransaction.findOne().sort({ createdAt: -1 }).lean(),
    ]);

    const totalTx = paymentsCount;
    const successRate = totalTx > 0 ? Number(((paidTx / totalTx) * 100).toFixed(1)) : 100;

    const transactionHealth = {
      status: failedTx > 0 && failedTx > paidTx ? "degraded" : "healthy",
      totalTransactions: totalTx,
      paidTransactions: paidTx,
      pendingTransactions: pendingTx,
      failedTransactions: failedTx,
      refundedTransactions: refundedTx,
      successRatePercentage: successRate,
      latestTransactionAt: latestTx?.createdAt || null,
      latestTransactionId: latestTx?.razorpayPaymentId || latestTx?._id || null,
    };

    const overallResponseTimeMs = Date.now() - startTime;

    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTimeMs: overallResponseTimeMs,
      api: apiHealth,
      database: databaseHealth,
      payment: razorpayHealth,
      transactions: transactionHealth,
    });
  } catch (error) {
    console.error("System health check error:", error);
    return res.status(500).json({
      status: "degraded",
      message: "Failed to perform system health check",
      error: error.message,
    });
  }
});

module.exports = router;