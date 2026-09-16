const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("@clerk/express");

const RetailerBill = require("../models/RetailerBill");
const PurchaseOrder = require("../models/PurchaseOrder");
const PaymentTransaction = require("../models/PaymentTransaction");
const requireRole = require("../middleware/requireRole");
const { isRetailerAdmin, retailerOwnershipFilter } = require("../middleware/retailerScope");

const router = express.Router();
const retailerRoles = requireRole("org:retailer", "org:retailer_admin");

function refreshBillStatuses(bills) {
  const now = new Date();
  return bills.map((bill) => {
    if (bill.status === "OPEN" && bill.dueDate < now) bill.status = "OVERDUE";
    return bill;
  });
}

router.get("/", retailerRoles, async (req, res) => {
  try {
    const auth = getAuth(req);
    const bills = refreshBillStatuses(
      await RetailerBill.find(retailerOwnershipFilter(auth))
        .populate("purchaseOrderIds", "poNumber supplierName totalAmount orderStatus paymentStatus")
        .sort({ createdAt: -1 })
        .lean()
    );

    const overdueIds = bills.filter((bill) => bill.status === "OVERDUE").map((bill) => bill._id);
    if (overdueIds.length) {
      await RetailerBill.updateMany({ _id: { $in: overdueIds } }, { $set: { status: "OVERDUE" } });
    }
    return res.json({ bills });
  } catch (error) {
    console.error("Fetch retailer bills error:", error);
    return res.status(500).json({ message: "Failed to fetch retailer bills" });
  }
});

router.post("/generate", retailerRoles, async (req, res) => {
  try {
    const auth = getAuth(req);
    const retailerUserId = req.body.retailerUserId || auth.userId;
    if (!isRetailerAdmin(auth) && retailerUserId !== auth.userId) {
      return res.status(403).json({ message: "You can only generate bills for your retailer account" });
    }

    const orders = await PurchaseOrder.find({
      organizationId: auth.orgId,
      retailerUserId,
      billId: null,
      paymentStatus: { $ne: "paid" },
      orderStatus: { $ne: "cancelled" },
    }).sort({ createdAt: 1 });

    if (!orders.length) return res.status(200).json({ message: "No unbilled purchases found", bill: null });

    const issuedAt = new Date();
    const dueDate = new Date(issuedAt);
    dueDate.setDate(dueDate.getDate() + 30);
    const bill = await RetailerBill.create({
      organizationId: auth.orgId,
      retailerUserId,
      purchaseOrderIds: orders.map((order) => order._id),
      totalAmount: Number(orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)),
      issuedAt,
      dueDate,
      status: "OPEN",
    });
    await PurchaseOrder.updateMany(
      { _id: { $in: orders.map((order) => order._id) } },
      { $set: { billId: bill._id } }
    );
    return res.status(201).json({ bill });
  } catch (error) {
    console.error("Generate retailer bill error:", error);
    return res.status(500).json({ message: "Failed to generate retailer bill" });
  }
});

router.get("/:id", retailerRoles, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid bill ID" });
    const bill = await RetailerBill.findOne({ _id: req.params.id, ...retailerOwnershipFilter(getAuth(req)) })
      .populate("purchaseOrderIds")
      .lean();
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status === "OPEN" && bill.dueDate < new Date()) bill.status = "OVERDUE";
    return res.json({ bill });
  } catch (error) {
    console.error("Fetch retailer bill error:", error);
    return res.status(500).json({ message: "Failed to fetch retailer bill" });
  }
});

module.exports = router;