const express = require("express");
const { getAuth } = require("@clerk/express");

const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// CREATE sale
router.post("/", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const {
      inventoryId,
      quantitySold,
      sellingPrice,
      discount,
      festival,
      promotion,
      saleDate,
    } = req.body;

    if (
      !inventoryId ||
      quantitySold === undefined ||
      sellingPrice === undefined ||
      !saleDate
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const inventory = await Inventory.findOne({
      _id: inventoryId,
      organizationId: auth.orgId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    if (quantitySold > inventory.quantity) {
      return res.status(400).json({
        message: "Insufficient inventory",
      });
    }

    const sale = await Sale.create({
      organizationId: auth.orgId,
      inventoryId: inventory._id,
      productName: inventory.productName,
      sku: inventory.sku,
      category: inventory.category,
      quantitySold,
      sellingPrice,
      discount: discount || 0,
      festival: festival || null,
      promotion: promotion || false,
      saleDate,
    });

    inventory.quantity -= quantitySold;

    await inventory.save();

    return res.status(201).json({
      message: "Sale recorded successfully",
      sale,
      remainingQuantity: inventory.quantity,
    });
  } catch (error) {
    console.error("Create sale error:", error);

    return res.status(500).json({
      message: "Failed to record sale",
    });
  }
});

// GET all sales
router.get("/", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const sales = await Sale.find({
      organizationId: auth.orgId,
    }).sort({ saleDate: -1 });

    return res.status(200).json({
      sales,
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(500).json({
      message: "Failed to fetch sales",
    });
  }
});

module.exports = router;