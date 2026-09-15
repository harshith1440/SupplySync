const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("@clerk/express");

const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// CREATE sale
router.post("/", requireRole("org:retailer"), async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const auth = getAuth(req);

    if (!auth.orgId || !auth.userId) {
      return res.status(400).json({
        message: "Authenticated retailer is required",
      });
    }

    const sku = String(req.body.sku || "").trim().toUpperCase();
    const quantity = Number(req.body.quantity ?? req.body.quantitySold);
    const idempotencyKey = String(
      req.get("Idempotency-Key") || req.body.idempotencyKey || ""
    ).trim() || null;

    if (!sku) {
      return res.status(400).json({
        message: "SKU is required",
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: "Sale quantity must be greater than zero",
      });
    }

    let response;
    await session.withTransaction(async () => {
      if (idempotencyKey) {
        const existingSale = await Sale.findOne({
          organizationId: auth.orgId,
          retailerUserId: auth.userId,
          idempotencyKey,
        }).session(session);

        if (existingSale) {
          const existingInventory = await Inventory.findOne({
            _id: existingSale.inventoryId,
            organizationId: auth.orgId,
            retailerUserId: auth.userId,
          }).session(session);

          response = {
            status: 200,
            body: {
              message: "Sale was already recorded",
              sale: existingSale,
              inventory: existingInventory,
            },
          };
          return;
        }
      }

      const inventory = await Inventory.findOne({
        organizationId: auth.orgId,
        retailerUserId: auth.userId,
        sku,
      }).session(session);

      if (!inventory) {
        const error = new Error("Inventory item not found for this retailer");
        error.statusCode = 404;
        throw error;
      }

      const updatedInventory = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          organizationId: auth.orgId,
          retailerUserId: auth.userId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true, runValidators: true, session }
      );

      if (!updatedInventory) {
        const error = new Error(
          `Insufficient inventory. Only ${inventory.quantity} units are available`
        );
        error.statusCode = 400;
        throw error;
      }

      const [sale] = await Sale.create(
        [
          {
            organizationId: auth.orgId,
            retailerUserId: auth.userId,
            inventoryId: updatedInventory._id,
            productName: updatedInventory.productName,
            sku: updatedInventory.sku,
            category: updatedInventory.category,
            quantitySold: quantity,
            sellingPrice: Number(
              req.body.sellingPrice ??
                updatedInventory.sellingPrice ??
                updatedInventory.price ??
                0
            ),
            discount: Number(req.body.discount || 0),
            festival: req.body.festival || null,
            promotion: Boolean(req.body.promotion),
            saleDate: req.body.saleDate || new Date(),
            idempotencyKey,
          },
        ],
        { session }
      );

      response = {
        status: 201,
        body: {
          message: "Sale recorded successfully",
          sale,
          inventory: updatedInventory,
          remainingQuantity: updatedInventory.quantity,
          stockStatus:
            updatedInventory.quantity === 0
              ? "out_of_stock"
              : updatedInventory.quantity <= updatedInventory.reorderLevel
              ? "low_stock"
              : "normal",
        },
      };
    });

    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error("Create sale error:", error);

    return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({
      message:
        error.code === 11000
          ? "A sale with this idempotency key was already recorded"
          : error.message || "Failed to record sale",
    });
  } finally {
    await session.endSession();
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
      retailerUserId: auth.userId,
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