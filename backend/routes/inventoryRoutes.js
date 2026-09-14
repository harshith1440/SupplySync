const express = require("express");
const { getAuth } = require("@clerk/express");

const Inventory = require("../models/Inventory");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// CREATE inventory item
router.post("/", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const {
      productName,
      sku,
      category,
      quantity,
      price,
      reorderLevel,
    } = req.body;

    if (
      !productName ||
      !sku ||
      !category ||
      quantity === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    const inventory = await Inventory.create({
      organizationId: auth.orgId,
      productName,
      sku,
      category,
      quantity,
      price,
      reorderLevel,
    });

    return res.status(201).json({
      message: "Inventory item created successfully",
      inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "SKU already exists in this organization",
      });
    }

    return res.status(500).json({
      message: "Failed to create inventory item",
    });
  }
});

// GET low-stock inventory items
router.get(
  "/low-stock",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const lowStockInventory = await Inventory.find({
        organizationId: auth.orgId,
        $expr: {
          $lte: ["$quantity", "$reorderLevel"],
        },
      }).sort({ quantity: 1 });

      return res.status(200).json({
        count: lowStockInventory.length,
        inventory: lowStockInventory,
      });
    } catch (error) {
      console.error("Get low-stock inventory error:", error);

      return res.status(500).json({
        message: "Failed to fetch low-stock inventory",
      });
    }
  }
);

// GET all inventory items
router.get("/", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const inventory = await Inventory.find({
      organizationId: auth.orgId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    return res.status(500).json({
      message: "Failed to fetch inventory",
    });
  }
});

// GET one inventory item
router.get("/:id", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const inventory = await Inventory.findOne({
      _id: req.params.id,
      organizationId: auth.orgId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    return res.status(200).json({
      inventory,
    });
  } catch (error) {
    console.error("Get inventory item error:", error);

    return res.status(500).json({
      message: "Failed to fetch inventory item",
    });
  }
});

// UPDATE inventory item
router.put("/:id", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const {
      productName,
      sku,
      category,
      quantity,
      price,
      reorderLevel,
    } = req.body;

    const inventory = await Inventory.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: auth.orgId,
      },
      {
        productName,
        sku,
        category,
        quantity,
        price,
        reorderLevel,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    return res.status(200).json({
      message: "Inventory item updated successfully",
      inventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "SKU already exists in this organization",
      });
    }

    return res.status(500).json({
      message: "Failed to update inventory item",
    });
  }
});

// DELETE inventory item
router.delete("/:id", requireRole("org:retailer"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.orgId) {
      return res.status(400).json({
        message: "Organization not found",
      });
    }

    const inventory = await Inventory.findOneAndDelete({
      _id: req.params.id,
      organizationId: auth.orgId,
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    return res.status(200).json({
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory error:", error);

    return res.status(500).json({
      message: "Failed to delete inventory item",
    });
  }
});

module.exports = router;