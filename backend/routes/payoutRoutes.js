const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("@clerk/express");

const PurchaseOrder = require("../models/PurchaseOrder");
const PaymentTransaction = require("../models/PaymentTransaction");
const SupplierPayout = require("../models/SupplierPayout");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE SUPPLIER PAYOUT
|--------------------------------------------------------------------------
| Admin creates a supplier payout for a successfully paid Purchase Order.
|
| POST /api/payouts
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const organizationId = auth.orgId;

      const { paymentTransactionId } = req.body;

      if (!paymentTransactionId) {
        return res.status(400).json({
          message: "paymentTransactionId is required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          paymentTransactionId
        )
      ) {
        return res.status(400).json({
          message: "Invalid payment transaction ID",
        });
      }

      const paymentTransaction =
        await PaymentTransaction.findOne({
          _id: paymentTransactionId,
          organizationId,
        });

      if (!paymentTransaction) {
        return res.status(404).json({
          message: "Payment transaction not found",
        });
      }

      if (
        paymentTransaction.paymentStatus !== "paid"
      ) {
        return res.status(400).json({
          message:
            "Supplier payout can only be created after successful payment",
        });
      }

      const purchaseOrder =
        await PurchaseOrder.findOne({
          _id: paymentTransaction.purchaseOrderId,
          organizationId,
        });

      if (!purchaseOrder) {
        return res.status(404).json({
          message: "Purchase order not found",
        });
      }

      if (
        purchaseOrder.paymentStatus !== "paid"
      ) {
        return res.status(400).json({
          message:
            "Purchase order payment is not marked as paid",
        });
      }

      const existingPayout =
        await SupplierPayout.findOne({
          organizationId,
          paymentTransactionId:
            paymentTransaction._id,
        });

      if (existingPayout) {
        return res.status(200).json({
          message:
            "Supplier payout already exists",

          payout: existingPayout,
        });
      }

      const referenceId =
        `PAYOUT-${Date.now()}`;

      const supplierPayout =
        await SupplierPayout.create({
          organizationId,

          supplierId:
            paymentTransaction.supplierId,

          supplierName:
            paymentTransaction.supplierName,

          purchaseOrderId:
            paymentTransaction.purchaseOrderId,

          poNumber:
            paymentTransaction.poNumber,

          paymentTransactionId:
            paymentTransaction._id,

          amount:
            paymentTransaction.amount,

          currency:
            paymentTransaction.currency,

          payoutStatus: "pending",

          payoutMethod: "simulated",

          referenceId,

          failureReason: null,

          processedAt: null,

          notes:
            "Supplier payout created from successful retailer payment",
        });

      paymentTransaction.transferStatus =
        "pending";

      await paymentTransaction.save();

      return res.status(201).json({
        message:
          "Supplier payout created successfully",

        payout: supplierPayout,

        paymentTransaction: {
          id: paymentTransaction._id,

          paymentStatus:
            paymentTransaction.paymentStatus,

          transferStatus:
            paymentTransaction.transferStatus,
        },
      });
    } catch (error) {
      console.error(
        "Create supplier payout error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create supplier payout",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET ALL PAYOUTS
|--------------------------------------------------------------------------
| Admin can monitor all supplier payouts.
|
| GET /api/payouts
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const organizationId = auth.orgId;

      const payouts =
        await SupplierPayout.find({
          organizationId,
        })
          .populate(
            "supplierId",
            "supplierName"
          )
          .populate(
            "purchaseOrderId",
            "poNumber totalAmount orderStatus paymentStatus"
          )
          .populate(
            "paymentTransactionId",
            "amount currency paymentStatus transferStatus razorpayPaymentId"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        count: payouts.length,
        payouts,
      });
    } catch (error) {
      console.error(
        "Get admin payouts error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch supplier payouts",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE PAYOUT
|--------------------------------------------------------------------------
|
| GET /api/payouts/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const organizationId = auth.orgId;

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid payout ID",
        });
      }

      const payout =
        await SupplierPayout.findOne({
          _id: id,
          organizationId,
        })
          .populate(
            "supplierId",
            "supplierName"
          )
          .populate(
            "purchaseOrderId",
            "poNumber totalAmount orderStatus paymentStatus"
          )
          .populate(
            "paymentTransactionId",
            "amount currency paymentStatus transferStatus razorpayPaymentId"
          );

      if (!payout) {
        return res.status(404).json({
          message: "Supplier payout not found",
        });
      }

      return res.status(200).json({
        payout,
      });
    } catch (error) {
      console.error(
        "Get supplier payout error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch supplier payout",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PROCESS PAYOUT
|--------------------------------------------------------------------------
| Admin moves payout:
|
| pending -> processing -> paid
|
| POST /api/payouts/:id/process
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/process",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const organizationId = auth.orgId;

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid payout ID",
        });
      }

      const payout =
        await SupplierPayout.findOne({
          _id: id,
          organizationId,
        });

      if (!payout) {
        return res.status(404).json({
          message: "Supplier payout not found",
        });
      }

      if (payout.payoutStatus === "paid") {
        return res.status(400).json({
          message:
            "Supplier payout is already paid",
        });
      }

      if (payout.payoutStatus === "reversed") {
        return res.status(400).json({
          message:
            "A reversed payout cannot be processed",
        });
      }

      if (payout.payoutStatus === "failed") {
        return res.status(400).json({
          message:
            "A failed payout cannot be processed directly",
        });
      }

      if (
        payout.payoutStatus === "pending"
      ) {
        payout.payoutStatus =
          "processing";

        await payout.save();

        return res.status(200).json({
          message:
            "Supplier payout is now processing",

          payout,
        });
      }

      if (
        payout.payoutStatus ===
        "processing"
      ) {
        payout.payoutStatus = "paid";

        payout.processedAt = new Date();

        payout.referenceId =
          payout.referenceId ||
          `PAYOUT-${Date.now()}`;

        await payout.save();

        await PaymentTransaction.findOneAndUpdate(
          {
            _id:
              payout.paymentTransactionId,

            organizationId,
          },
          {
            transferStatus: "processed",

            razorpayTransferId:
              null,
          }
        );

        return res.status(200).json({
          message:
            "Supplier payout marked as paid",

          payout,
        });
      }

      return res.status(400).json({
        message:
          "Invalid payout state",
      });
    } catch (error) {
      console.error(
        "Process supplier payout error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to process supplier payout",

        error: error.message,
      });
    }
  }
);

module.exports = router;