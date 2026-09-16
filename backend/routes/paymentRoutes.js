const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { getAuth } = require("@clerk/express");

const Supplier = require("../models/Supplier");
const SupplierPaymentProfile = require("../models/SupplierPaymentProfile");
const PurchaseOrder = require("../models/PurchaseOrder");
const PaymentTransaction = require("../models/PaymentTransaction");
const RetailerProfile = require("../models/RetailerProfile");
const { receivePurchaseOrder } = require("../services/receivePurchaseOrder");

const requireRole = require("../middleware/requireRole");

const {
  createRazorpayOrder,
  fetchRazorpayPayment,
  createRazorpayLinkedAccount,
  fetchRazorpayLinkedAccount,
} = require("../services/razorpayService");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
|--------------------------------------------------------------------------
| Retailer creates a Razorpay order for an existing Purchase Order.
|
| POST /api/payments/order
|--------------------------------------------------------------------------
*/

router.post(
  "/order",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      const organizationId = auth.orgId;
      const retailerUserId = auth.userId;

      const retailerProfile = await RetailerProfile.findOne({
        $or: [
          { organizationId, clerkUserId: retailerUserId },
          { clerkUserId: retailerUserId },
        ],
      }).lean();

      if (!retailerProfile || retailerProfile.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Retailer account is pending admin approval and cannot initiate payments yet.",
          approvalStatus: retailerProfile?.approvalStatus || "PENDING",
        });
      }

      const { purchaseOrderId } = req.body;

      if (!purchaseOrderId) {
        return res.status(400).json({
          message: "purchaseOrderId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
        return res.status(400).json({
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        organizationId,
        retailerUserId,
      }).populate("supplierId");

      if (!purchaseOrder) {
        return res.status(404).json({
          message: "Purchase order not found",
        });
      }

      if (!purchaseOrder.supplierOrganizationId && purchaseOrder.supplierId?.organizationId) {
        purchaseOrder.supplierOrganizationId = purchaseOrder.supplierId.organizationId;
      }

      if (!purchaseOrder.supplierSnapshot && purchaseOrder.supplierId) {
        const supplier = purchaseOrder.supplierId;
        const address = supplier.address || {};
        purchaseOrder.supplierSnapshot = {
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

      if (purchaseOrder.orderStatus === "cancelled") {
        return res.status(400).json({
          message:
            "Cannot make payment for a cancelled purchase order",
        });
      }

      if (purchaseOrder.paymentStatus === "paid") {
        return res.status(400).json({
          message: "Purchase order is already paid",
        });
      }

      if (
        !purchaseOrder.totalAmount ||
        purchaseOrder.totalAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Purchase order has an invalid payment amount",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | REUSE EXISTING RAZORPAY ORDER
      |--------------------------------------------------------------------------
      */

      if (purchaseOrder.razorpayOrderId) {
        const existingTransaction =
          await PaymentTransaction.findOne({
            purchaseOrderId: purchaseOrder._id,
            razorpayOrderId: purchaseOrder.razorpayOrderId,
          });

        if (existingTransaction) {
          return res.status(200).json({
            message: "Existing Razorpay order returned",

            paymentTransactionId:
              existingTransaction._id,

            razorpayOrder: {
              id: existingTransaction.razorpayOrderId,

              amount: Math.round(
                existingTransaction.amount * 100
              ),

              currency:
                existingTransaction.currency,
            },

            purchaseOrder: {
              id: purchaseOrder._id,

              poNumber:
                purchaseOrder.poNumber,

              totalAmount:
                purchaseOrder.totalAmount,

              supplierName:
                purchaseOrder.supplierName,
            },

            keyId:
              process.env.RAZORPAY_KEY_ID,
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE RAZORPAY ORDER
      |--------------------------------------------------------------------------
      */

      const razorpayAmount = Math.round(
        purchaseOrder.totalAmount * 100
      );

      const razorpayOrder =
        await createRazorpayOrder({
          amount: razorpayAmount,

          currency: "INR",

          receipt:
            purchaseOrder.poNumber,

          notes: {
            purchaseOrderId:
              purchaseOrder._id.toString(),

            poNumber:
              purchaseOrder.poNumber,

            supplierName:
              purchaseOrder.supplierName,

            organizationId,
          },
        });

      /*
      |--------------------------------------------------------------------------
      | SAVE RAZORPAY ORDER ID TO PURCHASE ORDER
      |--------------------------------------------------------------------------
      */

      purchaseOrder.razorpayOrderId =
        razorpayOrder.id;

      await purchaseOrder.save();

      /*
      |--------------------------------------------------------------------------
      | CREATE INTERNAL PAYMENT TRANSACTION
      |--------------------------------------------------------------------------
      */

      const paymentTransaction =
        await PaymentTransaction.create({
          organizationId,

          retailerUserId,

          supplierId:
            purchaseOrder.supplierId._id,

          supplierOrganizationId:
            purchaseOrder.supplierOrganizationId,

          supplierName:
            purchaseOrder.supplierName,

          retailerName: purchaseOrder.retailerName,
          retailerEmail: purchaseOrder.retailerEmail,
          retailerPhone: purchaseOrder.retailerPhone,
          retailerAddress: purchaseOrder.retailerAddress,
          deliveryAddress: purchaseOrder.deliveryAddress,

          purchaseOrderId:
            purchaseOrder._id,

          poNumber:
            purchaseOrder.poNumber,

          amount:
            purchaseOrder.totalAmount,

          currency: "INR",

          paymentStatus: "pending",

          transferStatus: "not_started",

          razorpayOrderId:
            razorpayOrder.id,
        });

      return res.status(201).json({
        message:
          "Razorpay order created successfully",

        paymentTransactionId:
          paymentTransaction._id,

        razorpayOrder: {
          id: razorpayOrder.id,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency,
        },

        purchaseOrder: {
          id: purchaseOrder._id,

          poNumber:
            purchaseOrder.poNumber,

          totalAmount:
            purchaseOrder.totalAmount,

          supplierName:
            purchaseOrder.supplierName,
        },

        keyId:
          process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error(
        "Create Razorpay order error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create Razorpay order",

        error:
          error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| VERIFY RAZORPAY PAYMENT
|--------------------------------------------------------------------------
| Verifies:
| 1. Razorpay signature
| 2. Razorpay order
| 3. Payment amount
| 4. Currency
| 5. Captured status
|
| POST /api/payments/verify
|--------------------------------------------------------------------------
*/

router.post(
  "/verify",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      const organizationId = auth.orgId;
      const retailerUserId = auth.userId;

      const {
        purchaseOrderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } = req.body;

      if (
        !purchaseOrderId ||
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature
      ) {
        return res.status(400).json({
          message:
            "All payment verification fields are required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          purchaseOrderId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid purchase order ID",
        });
      }

      const purchaseOrder =
        await PurchaseOrder.findOne({
          _id: purchaseOrderId,
          organizationId,
          retailerUserId,
        });

      if (!purchaseOrder) {
        return res.status(404).json({
          message:
            "Purchase order not found",
        });
      }

      if (
        purchaseOrder.razorpayOrderId !==
        razorpayOrderId
      ) {
        return res.status(400).json({
          message:
            "Razorpay order does not match the purchase order",
        });
      }

      const paymentTransaction =
        await PaymentTransaction.findOne({
          purchaseOrderId:
            purchaseOrder._id,

          organizationId,

          razorpayOrderId,
        });

      if (!paymentTransaction) {
        return res.status(404).json({
          message:
            "Payment transaction not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ALREADY VERIFIED
      |--------------------------------------------------------------------------
      */

      if (
        paymentTransaction.paymentStatus ===
        "paid"
      ) {
        await receivePurchaseOrder(purchaseOrder._id);

        return res.status(200).json({
          message:
            "Payment is already verified",

          paymentTransactionId:
            paymentTransaction._id,

          purchaseOrderId:
            purchaseOrder._id,

          paymentStatus:
            paymentTransaction.paymentStatus,
        });
      }

      const keySecret =
        process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        return res.status(500).json({
          message:
            "Razorpay secret is not configured",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY SIGNATURE
      |--------------------------------------------------------------------------
      */

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            keySecret
          )
          .update(
            `${razorpayOrderId}|${razorpayPaymentId}`
          )
          .digest("hex");

      const expectedBuffer =
        Buffer.from(
          expectedSignature,
          "utf8"
        );

      const receivedBuffer =
        Buffer.from(
          razorpaySignature,
          "utf8"
        );

      if (
        expectedBuffer.length !==
          receivedBuffer.length ||
        !crypto.timingSafeEqual(
          expectedBuffer,
          receivedBuffer
        )
      ) {
        paymentTransaction.paymentStatus =
          "failed";

        paymentTransaction.failureReason =
          "Invalid Razorpay payment signature";

        await paymentTransaction.save();

        return res.status(400).json({
          message:
            "Payment signature verification failed",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FETCH PAYMENT FROM RAZORPAY
      |--------------------------------------------------------------------------
      */

      const razorpayPayment =
        await fetchRazorpayPayment(
          razorpayPaymentId
        );

      /*
      |--------------------------------------------------------------------------
      | VERIFY PAYMENT ORDER
      |--------------------------------------------------------------------------
      */

      if (
        razorpayPayment.order_id !==
        razorpayOrderId
      ) {
        return res.status(400).json({
          message:
            "Payment does not belong to the Razorpay order",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY PAYMENT AMOUNT
      |--------------------------------------------------------------------------
      */

      const expectedAmount =
        Math.round(
          purchaseOrder.totalAmount * 100
        );

      if (
        Number(
          razorpayPayment.amount
        ) !== expectedAmount
      ) {
        return res.status(400).json({
          message:
            "Payment amount does not match the purchase order",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CURRENCY
      |--------------------------------------------------------------------------
      */

      if (
        razorpayPayment.currency !==
        "INR"
      ) {
        return res.status(400).json({
          message:
            "Payment currency does not match the purchase order",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CAPTURED STATUS
      |--------------------------------------------------------------------------
      */

      if (
        razorpayPayment.status !==
        "captured"
      ) {
        return res.status(400).json({
          message:
            `Payment is not captured. Current status: ${razorpayPayment.status}`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE INTERNAL PAYMENT TRANSACTION
      |--------------------------------------------------------------------------
      */

      await receivePurchaseOrder(purchaseOrder._id, {
        paymentTransactionId: paymentTransaction._id,
        razorpayPaymentId,
        razorpaySignature,
      });

      return res.status(200).json({
        message:
          "Payment verified successfully",

        paymentTransactionId:
          paymentTransaction._id,

        purchaseOrderId:
          purchaseOrder._id,

        paymentStatus:
          paymentTransaction.paymentStatus,
      });
    } catch (error) {
      console.error(
        "Payment verification error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to verify payment",

        error:
          error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE SUPPLIER RAZORPAY LINKED ACCOUNT
|--------------------------------------------------------------------------
| Admin-only operation.
|
| POST
| /api/payments/suppliers/:supplierId/linked-account
|--------------------------------------------------------------------------
*/

router.post(
  "/suppliers/:supplierId/linked-account",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      const organizationId =
        auth.orgId;

      const { supplierId } =
        req.params;

      const {
        email,
        phone,
        legalBusinessName,
        customerFacingBusinessName,
        businessType,
        profile,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDATE SUPPLIER ID
      |--------------------------------------------------------------------------
      */

      if (
        !mongoose.Types.ObjectId.isValid(
          supplierId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier ID",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE REQUIRED DATA
      |--------------------------------------------------------------------------
      */

      if (
        !email ||
        !phone ||
        !legalBusinessName ||
        !customerFacingBusinessName ||
        !businessType ||
        !profile
      ) {
        return res.status(400).json({
          message:
            "email, phone, legalBusinessName, customerFacingBusinessName, businessType and profile are required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND SUPPLIER
      |--------------------------------------------------------------------------
      */

      const supplier =
        await Supplier.findOne({
          _id: supplierId,
          organizationId,
        });

      if (!supplier) {
        return res.status(404).json({
          message:
            "Supplier not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK EXISTING PAYMENT PROFILE
      |--------------------------------------------------------------------------
      */

      const existingProfile =
        await SupplierPaymentProfile.findOne(
          {
            supplierId,
            organizationId,
          }
        );

      if (existingProfile) {
        return res.status(400).json({
          message:
            "This supplier already has a Razorpay Linked Account",

          razorpayAccountId:
            existingProfile.razorpayAccountId,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE REFERENCE ID
      |--------------------------------------------------------------------------
      */

      const referenceId =
        `SUP-${supplier._id
          .toString()
          .slice(-12)}`;

      /*
      |--------------------------------------------------------------------------
      | CREATE RAZORPAY LINKED ACCOUNT
      |--------------------------------------------------------------------------
      */

      const razorpayAccount =
        await createRazorpayLinkedAccount({
          email,

          phone: String(phone),

          legalBusinessName,

          customerFacingBusinessName,

          businessType,

          referenceId,

          profile,
        });

      /*
      |--------------------------------------------------------------------------
      | SAVE LINKED ACCOUNT INFORMATION
      |--------------------------------------------------------------------------
      */

      const supplierPaymentProfile =
        await SupplierPaymentProfile.create(
          {
            supplierId:
              supplier._id,

            organizationId,

            razorpayAccountId:
              razorpayAccount.id,

            razorpayAccountStatus:
              razorpayAccount.status ||
              "unknown",

            email,

            phone: String(phone),

            legalBusinessName,

            customerFacingBusinessName,

            businessType,
          }
        );

      return res.status(201).json({
        message:
          "Supplier Razorpay Linked Account created successfully",

        supplierPaymentProfile: {
          id:
            supplierPaymentProfile._id,

          supplierId:
            supplierPaymentProfile.supplierId,

          razorpayAccountId:
            supplierPaymentProfile
              .razorpayAccountId,

          razorpayAccountStatus:
            supplierPaymentProfile
              .razorpayAccountStatus,
        },

        razorpayAccount: {
          id:
            razorpayAccount.id,

          status:
            razorpayAccount.status,

          type:
            razorpayAccount.type,

          email:
            razorpayAccount.email,
        },
      });
    } catch (error) {
      console.error(
        "Create supplier Razorpay Linked Account error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create supplier Razorpay Linked Account",

        error:
          error.error?.description ||
          error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| FETCH SUPPLIER LINKED ACCOUNT
|--------------------------------------------------------------------------
| Admin-only operation.
|
| GET
| /api/payments/suppliers/:supplierId/linked-account
|--------------------------------------------------------------------------
*/

router.get(
  "/suppliers/:supplierId/linked-account",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      const organizationId =
        auth.orgId;

      const { supplierId } =
        req.params;

      /*
      |--------------------------------------------------------------------------
      | VALIDATE SUPPLIER ID
      |--------------------------------------------------------------------------
      */

      if (
        !mongoose.Types.ObjectId.isValid(
          supplierId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid supplier ID",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND INTERNAL PAYMENT PROFILE
      |--------------------------------------------------------------------------
      */

      const supplierPaymentProfile =
        await SupplierPaymentProfile.findOne(
          {
            supplierId,
            organizationId,
          }
        );

      if (!supplierPaymentProfile) {
        return res.status(404).json({
          message:
            "Supplier does not have a Razorpay Linked Account",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FETCH CURRENT ACCOUNT STATUS FROM RAZORPAY
      |--------------------------------------------------------------------------
      */

      const razorpayAccount =
        await fetchRazorpayLinkedAccount(
          supplierPaymentProfile
            .razorpayAccountId
        );

      /*
      |--------------------------------------------------------------------------
      | UPDATE LOCAL STATUS
      |--------------------------------------------------------------------------
      */

      supplierPaymentProfile
        .razorpayAccountStatus =
        razorpayAccount.status ||
        "unknown";

      await supplierPaymentProfile.save();

      return res.status(200).json({
        supplierPaymentProfile: {
          id:
            supplierPaymentProfile._id,

          supplierId:
            supplierPaymentProfile.supplierId,

          razorpayAccountId:
            supplierPaymentProfile
              .razorpayAccountId,

          razorpayAccountStatus:
            supplierPaymentProfile
              .razorpayAccountStatus,
        },

        razorpayAccount: {
          id:
            razorpayAccount.id,

          status:
            razorpayAccount.status,

          type:
            razorpayAccount.type,

          email:
            razorpayAccount.email,
        },
      });
    } catch (error) {
      console.error(
        "Fetch supplier Razorpay Linked Account error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch supplier Razorpay Linked Account",

        error:
          error.error?.description ||
          error.message,
      });
    }
  }
);

module.exports = router;