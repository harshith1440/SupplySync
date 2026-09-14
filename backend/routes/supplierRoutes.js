const express = require("express");
const { getAuth } = require("@clerk/express");

const Supplier = require("../models/Supplier");
const requireRole = require("../middleware/requireRole");

const {
  getForecastBasedSupplierRecommendation,
} = require("../services/supplierService");

const router = express.Router();

/*
========================================================
GET ALL ACTIVE SUPPLIERS
========================================================
*/

router.get(
  "/",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const suppliers = await Supplier.find({
        organizationId: auth.orgId,
        active: true,
      })
        .sort({
          supplierName: 1,
        })
        .lean();

      return res.status(200).json({
        message:
          "Suppliers fetched successfully",

        count: suppliers.length,

        suppliers,
      });
    } catch (error) {
      console.error(
        "Fetch suppliers error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch suppliers",
      });
    }
  }
);

/*
========================================================
GET FORECAST-BASED SUPPLIER RECOMMENDATION
========================================================

GET /api/suppliers/forecast-recommendation/:sku

Flow:

Inventory
   ↓
ML Demand Forecast
   ↓
Required Quantity
   ↓
Supplier Scoring
   ↓
Recommended Supplier
   ↓
Alternative Suppliers
*/

router.get(
  "/forecast-recommendation/:sku",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const normalizedSku =
        req.params.sku
          .trim()
          .toUpperCase();

      const recommendation =
        await getForecastBasedSupplierRecommendation(
          auth.orgId,
          normalizedSku
        );

      return res.status(200).json({
        message:
          "Forecast-based supplier recommendation generated successfully",

        recommendation,
      });
    } catch (error) {
      console.error(
        "Forecast-based supplier recommendation error:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to generate supplier recommendation",
      });
    }
  }
);

/*
========================================================
GET SUPPLIERS FOR A SPECIFIC SKU
========================================================

GET /api/suppliers/:sku

Uses the supplier.products catalog.
*/

router.get(
  "/:sku",
  requireRole("org:retailer"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const normalizedSku =
        req.params.sku
          .trim()
          .toUpperCase();

      const suppliers =
        await Supplier.find({
          organizationId: auth.orgId,
          active: true,
        }).lean();

      const matchingSuppliers = [];

      for (const supplier of suppliers) {
        const product =
          supplier.products.find(
            (item) =>
              item.sku === normalizedSku
          );

        if (product) {
          matchingSuppliers.push({
            supplierId:
              supplier._id,

            supplierName:
              supplier.supplierName,

            contactPerson:
              supplier.contactPerson,

            email:
              supplier.email,

            phone:
              supplier.phone,

            leadTimeDays:
              supplier.leadTimeDays,

            reliabilityScore:
              supplier.reliabilityScore,

            rating:
              supplier.rating,

            product,
          });
        }
      }

      if (
        matchingSuppliers.length === 0
      ) {
        return res.status(404).json({
          message:
            `No active suppliers found for SKU ${normalizedSku}`,
        });
      }

      matchingSuppliers.sort(
        (a, b) =>
          a.product.unitPrice -
          b.product.unitPrice
      );

      return res.status(200).json({
        message:
          "Suppliers for SKU fetched successfully",

        sku: normalizedSku,

        count:
          matchingSuppliers.length,

        suppliers:
          matchingSuppliers,
      });
    } catch (error) {
      console.error(
        "Fetch suppliers by SKU error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch suppliers for this SKU",
      });
    }
  }
);

module.exports = router;