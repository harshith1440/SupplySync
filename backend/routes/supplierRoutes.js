const express = require("express");
const mongoose = require("mongoose");
const { getAuth } = require("@clerk/express");

const Supplier = require("../models/Supplier");
const requireRole = require("../middleware/requireRole");

const {
  getForecastBasedSupplierRecommendation,
} = require("../services/supplierService");

const router = express.Router();

/*
========================================================
GET CURRENT SUPPLIER PROFILE
========================================================

GET /api/suppliers/me

Supplier login
   ↓
Clerk user ID
   ↓
Supplier.clerkUserId
   ↓
Specific supplier
*/

router.get(
  "/me",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      if (!auth.userId) {
        return res.status(401).json({
          message: "User not authenticated",
        });
      }

      const supplier = await Supplier.findOne({
        organizationId: auth.orgId,
        clerkUserId: auth.userId,
        active: true,
      }).lean();

      if (!supplier) {
        return res.status(404).json({
          message:
            "No supplier profile is linked to this account",
        });
      }

      return res.status(200).json({
        message: "Supplier profile fetched successfully",
        supplier,
      });
    } catch (error) {
      console.error(
        "Fetch current supplier profile error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch supplier profile",
        error: error.message,
      });
    }
  }
);

/*
========================================================
MAP CLERK USER TO SUPPLIER
========================================================

POST /api/suppliers/admin/map-user

Admin provides:

{
  "supplierId": "...",
  "clerkUserId": "user_..."
}

This connects one Clerk supplier account
to one supplier record.
*/

router.post(
  "/admin/map-user",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      const {
        supplierId,
        clerkUserId,
      } = req.body;

      if (!supplierId) {
        return res.status(400).json({
          message: "supplierId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          message: "Invalid supplier ID",
        });
      }

      if (!clerkUserId) {
        return res.status(400).json({
          message: "clerkUserId is required",
        });
      }

      if (
        typeof clerkUserId !== "string" ||
        !clerkUserId.trim()
      ) {
        return res.status(400).json({
          message: "Invalid Clerk user ID",
        });
      }

      const normalizedClerkUserId =
        clerkUserId.trim();

      const supplier = await Supplier.findOne({
        _id: supplierId,
        organizationId: auth.orgId,
      });

      if (!supplier) {
        return res.status(404).json({
          message: "Supplier not found",
        });
      }

      const supplierWithUser =
        await Supplier.findOne({
          organizationId: auth.orgId,
          clerkUserId:
            normalizedClerkUserId,
          _id: {
            $ne: supplier._id,
          },
        });

      if (supplierWithUser) {
        return res.status(409).json({
          message:
            "This Clerk user is already linked to another supplier",
          supplier: {
            id: supplierWithUser._id,
            supplierName:
              supplierWithUser.supplierName,
          },
        });
      }

      if (
        supplier.clerkUserId &&
        supplier.clerkUserId !==
          normalizedClerkUserId
      ) {
        return res.status(409).json({
          message:
            "This supplier is already linked to another Clerk user",
        });
      }

      supplier.clerkUserId =
        normalizedClerkUserId;

      await supplier.save();

      return res.status(200).json({
        message:
          "Supplier successfully linked to Clerk user",
        supplier: {
          id: supplier._id,
          supplierName:
            supplier.supplierName,
          clerkUserId:
            supplier.clerkUserId,
        },
      });
    } catch (error) {
      console.error(
        "Map supplier Clerk user error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to map supplier to Clerk user",
        error: error.message,
      });
    }
  }
);

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