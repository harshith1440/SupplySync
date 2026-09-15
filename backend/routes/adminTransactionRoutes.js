const express = require("express");
const { getAuth, clerkClient } = require("@clerk/express");

const PaymentTransaction = require("../models/PaymentTransaction");
const SupplierPayout = require("../models/SupplierPayout");
const PurchaseOrder = require("../models/PurchaseOrder");

const requireRole = require("../middleware/requireRole");

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
      FETCH RETAILER DETAILS FROM CLERK
      --------------------------------------------------
      */

      const retailerMap = new Map();

      await Promise.all(
        retailerIds.map(
          async (retailerId) => {
            try {
              const retailer =
                await clerkClient.users.getUser(
                  retailerId
                );

              retailerMap.set(
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
                      ?.emailAddress ||
                    null,
                }
              );
            } catch (error) {
              console.error(
                `Failed to fetch retailer ${retailerId}:`,
                error
              );

              retailerMap.set(
                retailerId,
                {
                  userId: retailerId,
                  name: retailerId,
                  email: null,
                }
              );
            }
          }
        )
      );

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

module.exports = router;