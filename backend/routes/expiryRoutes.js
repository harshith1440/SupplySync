const express = require("express");
const { getAuth } = require("@clerk/express");

const Inventory = require("../models/Inventory");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// GET expired products
router.get("/expired", requireRole("org:retailer", "org:retailer_admin"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const expiredInventory = await Inventory.find({
      organizationId: auth.orgId,
      expiryDate: {
        $ne: null,
        $lt: startOfToday,
      },
    }).sort({ expiryDate: 1 });

    return res.status(200).json({
      count: expiredInventory.length,
      inventory: expiredInventory,
    });
  } catch (error) {
    console.error("Get expired inventory error:", error);

    return res.status(500).json({
      message: "Failed to fetch expired inventory",
    });
  }
});

// GET products expiring within 7 days
router.get(
  "/expiring-soon",
  requireRole("org:retailer", "org:retailer_admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfSeventhDay = new Date(startOfToday);
      endOfSeventhDay.setDate(endOfSeventhDay.getDate() + 7);
      endOfSeventhDay.setHours(23, 59, 59, 999);

      const expiringSoonInventory = await Inventory.find({
        organizationId: auth.orgId,

        expiryDate: {
          $gte: startOfToday,
          $lte: endOfSeventhDay,
        },
      }).sort({ expiryDate: 1 });

      return res.status(200).json({
        count: expiringSoonInventory.length,
        inventory: expiringSoonInventory,
      });
    } catch (error) {
      console.error(
        "Get expiring-soon inventory error:",
        error
      );

      return res.status(500).json({
        message: "Failed to fetch expiring-soon inventory",
      });
    }
  }
);

module.exports = router;