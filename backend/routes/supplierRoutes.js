const express = require("express");
const mongoose = require("mongoose");
const { getAuth, clerkClient } = require("@clerk/express");

const Supplier = require("../models/Supplier");
const requireRole = require("../middleware/requireRole");

const {
  getForecastBasedSupplierRecommendation,
} = require("../services/supplierService");

const router = express.Router();

function normalizeProduct(body) {
  return {
    sku: String(body.sku || "").trim().toUpperCase(),
    productName: String(body.productName || "").trim(),
    brand: String(body.brand || "").trim() || null,
    category: String(body.category || "").trim(),
    unit: String(body.unit || "piece").trim(),
    unitPrice: Number(body.unitPrice),
    minimumOrderQuantity: Number(body.minimumOrderQuantity),
    availableQuantity: Number(body.availableQuantity),
    active: body.active !== false,
    leadTimeDays: body.leadTimeDays === "" || body.leadTimeDays === undefined
      ? null
      : Number(body.leadTimeDays),
    manufacturingDate: body.manufacturingDate || null,
    expiryDate: body.expiryDate || null,
  };
}

function validateProduct(product) {
  return product.sku && product.productName && product.brand && product.category &&
    product.unit && product.manufacturingDate && product.expiryDate &&
    new Date(product.manufacturingDate) <= new Date(product.expiryDate) &&
    Number.isFinite(product.unitPrice) && product.unitPrice >= 0 &&
    Number.isInteger(product.minimumOrderQuantity) && product.minimumOrderQuantity >= 1 &&
    Number.isInteger(product.availableQuantity) && product.availableQuantity >= 0 &&
    Number.isFinite(product.leadTimeDays) && product.leadTimeDays >= 0 &&
    typeof product.active === "boolean";
}

function normalizeSupplierProfile(body) {
  const address = body.address || {};
  const supplierName = String(body.supplierName || body.businessName || body.shopName || "").trim();
  const businessName = String(body.businessName || body.shopName || supplierName || "").trim();
  const normalizedAddress = {
    addressLine1: String(body.addressLine1 || address.addressLine1 || address.line1 || "").trim(),
    addressLine2: String(body.addressLine2 || address.addressLine2 || address.line2 || "").trim(),
    city: String(body.city || address.city || "").trim(),
    state: String(body.state || address.state || "").trim(),
    pincode: String(body.pincode || address.pincode || address.postalCode || "").trim(),
    country: String(body.country || address.country || "India").trim(),
  };

  return {
    supplierName,
    businessName,
    leadTimeDays: body.leadTimeDays === "" || body.leadTimeDays === undefined
      ? 0
      : Number(body.leadTimeDays),
    contactPerson: String(body.contactPerson || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    address: normalizedAddress,
    addressLine1: normalizedAddress.addressLine1,
    addressLine2: normalizedAddress.addressLine2,
    city: normalizedAddress.city,
    state: normalizedAddress.state,
    pincode: normalizedAddress.pincode,
    country: normalizedAddress.country,
    description: String(body.description || "").trim() || null,
  };
}

function validateSupplierProfile(profile) {
  return profile.supplierName && profile.contactPerson && profile.email &&
    profile.phone && profile.address.addressLine1 && profile.address.city &&
    profile.address.state && profile.address.pincode && profile.address.country &&
    Number.isFinite(profile.leadTimeDays) && profile.leadTimeDays >= 0;
}

function supplierSnapshot(supplier) {
  const address = supplier.address || {};
  return {
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

function marketplaceSupplier(supplier) {
  return {
    _id: supplier._id,
    supplierId: supplier._id,
    supplierName: supplier.supplierName,
    businessName: supplier.businessName || supplier.supplierName,
    contactPerson: supplier.contactPerson || null,
    phone: supplier.phone || null,
    address: supplier.address || null,
    addressLine1: supplier.addressLine1 || supplier.address?.addressLine1 || supplier.address?.line1 || null,
    addressLine2: supplier.addressLine2 || supplier.address?.addressLine2 || supplier.address?.line2 || null,
    city: supplier.city || supplier.address?.city || null,
    state: supplier.state || supplier.address?.state || null,
    pincode: supplier.pincode || supplier.address?.pincode || supplier.address?.postalCode || null,
    country: supplier.country || supplier.address?.country || null,
    leadTimeDays: supplier.leadTimeDays,
    reliabilityScore: supplier.reliabilityScore,
    rating: supplier.rating,
    products: supplier.products,
  };
}

function hasMarketplaceIdentity(supplier) {
  const name = String(supplier.businessName || supplier.supplierName || "").trim();
  const email = String(supplier.email || "").trim().toLowerCase();
  return Boolean(
    name &&
    name.toLowerCase() !== email &&
    supplier.contactPerson &&
    supplier.phone
  );
}

async function requireApprovedSupplier(auth, res, { allowPending = false } = {}) {
  if (!auth?.orgId || !auth?.userId) {
    return null;
  }

  const supplier = await Supplier.findOne({
    organizationId: auth.orgId,
    clerkUserId: auth.userId,
    active: true,
  }).lean();

  if (!supplier) {
    return null;
  }

  if (supplier.approvalStatus !== "APPROVED" && !allowPending) {
    res.status(403).json({
      message: "Supplier account is pending admin approval and cannot perform supplier operations yet.",
      approvalStatus: supplier.approvalStatus || "PENDING",
    });
    return null;
  }

  return supplier;
}

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

      let supplier = await Supplier.findOne({
        organizationId: auth.orgId,
        clerkUserId: auth.userId,
        active: true,
      });

      if (!supplier) {
        let clerkUser = null;
        try {
          clerkUser = await clerkClient.users.getUser(auth.userId);
        } catch (error) {
          console.error("Fetch supplier details from Clerk error:", error);
        }

        const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || null;
        if (email) {
          supplier = await Supplier.findOne({
            organizationId: auth.orgId,
            email,
            clerkUserId: null,
          });
        }

        if (supplier) {
          supplier.clerkUserId = auth.userId;
          await supplier.save();
        } else {
          supplier = await Supplier.findOneAndUpdate(
            { organizationId: auth.orgId, clerkUserId: auth.userId },
            {
              $setOnInsert: {
                organizationId: auth.orgId,
                clerkUserId: auth.userId,
                supplierName: clerkUser?.fullName || clerkUser?.username || email || "New Supplier",
                contactPerson: clerkUser?.fullName || clerkUser?.username || null,
                email,
                products: [],
                leadTimeDays: 0,
                reliabilityScore: 0,
                rating: 0,
                active: true,
                approvalStatus: "PENDING",
              },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        }
      }

      if (!supplier) {
        return res.status(404).json({
          message:
            "No supplier profile is linked to this account",
        });
      }

      if (supplier.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Supplier account is pending admin approval and cannot access supplier operations yet.",
          approvalStatus: supplier.approvalStatus || "PENDING",
        });
      }

      return res.status(200).json({
        message: "Supplier profile fetched successfully",
        supplier: supplier.toObject ? supplier.toObject() : supplier,
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

router.get(
  "/me/products",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const supplier = await Supplier.findOne({
        organizationId: auth.orgId,
        clerkUserId: auth.userId,
        active: true,
      }).lean();
      if (!supplier) return res.status(404).json({ message: "Supplier profile not found" });
      if (supplier.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Supplier account is pending admin approval and cannot view products yet.",
          approvalStatus: supplier.approvalStatus || "PENDING",
        });
      }
      return res.json({ products: supplier.products || [] });
    } catch (error) {
      console.error("Fetch supplier products error:", error);
      return res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  }
);

router.put(
  "/me/profile",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const supplier = await Supplier.findOne({
        organizationId: auth.orgId,
        clerkUserId: auth.userId,
        active: true,
      });
      if (!supplier) return res.status(404).json({ message: "Supplier profile not found" });
      if (supplier.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Supplier account is pending admin approval and cannot update profile details yet.",
          approvalStatus: supplier.approvalStatus || "PENDING",
        });
      }
      const profile = normalizeSupplierProfile(req.body);
      if (!validateSupplierProfile(profile)) {
        return res.status(400).json({ message: "Complete supplier profile details are required" });
      }
      const updatedSupplier = await Supplier.findOneAndUpdate(
        { organizationId: auth.orgId, clerkUserId: auth.userId, active: true },
        { $set: profile },
        { new: true, runValidators: true }
      ).lean();
      return res.json({ message: "Supplier profile saved successfully", supplier: updatedSupplier });
    } catch (error) {
      console.error("Save supplier profile error:", error);
      return res.status(500).json({ message: "Failed to save supplier profile" });
    }
  }
);

router.post(
  "/me/products",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const product = normalizeProduct(req.body);
      if (!validateProduct(product)) return res.status(400).json({ message: "Product name, SKU, brand, category, unit, price, MOQ, stock, lead time, and valid manufacturing/expiry dates are required" });
      const supplier = await Supplier.findOne({ organizationId: auth.orgId, clerkUserId: auth.userId, active: true });
      if (!supplier) return res.status(404).json({ message: "Supplier profile not found" });
      if (supplier.approvalStatus !== "APPROVED") {
        return res.status(403).json({
          message: "Supplier account is pending admin approval and cannot manage catalog items yet.",
          approvalStatus: supplier.approvalStatus || "PENDING",
        });
      }
      if (supplier.products.some((item) => item.sku === product.sku)) return res.status(409).json({ message: "SKU already exists in supplier catalog" });
      product.supplierId = supplier._id;
      product.organizationId = auth.orgId;
      supplier.products.push(product);
      await supplier.save();
      return res.status(201).json({ message: "Supplier product added successfully", product: supplier.products[supplier.products.length - 1] });
    } catch (error) {
      console.error("Add supplier product error:", error);
      return res.status(500).json({ message: "Failed to add supplier product" });
    }
  }
);

router.patch(
  "/me/products/:sku",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const supplier = await Supplier.findOne({ organizationId: auth.orgId, clerkUserId: auth.userId, active: true });
      if (!supplier) return res.status(404).json({ message: "Supplier profile not found" });
      const currentSku = req.params.sku.trim().toUpperCase();
      const index = supplier.products.findIndex((item) => item.sku === currentSku);
      if (index < 0) return res.status(404).json({ message: "Supplier product not found" });
      const product = normalizeProduct({ ...supplier.products[index].toObject(), ...req.body });
      if (!validateProduct(product)) return res.status(400).json({ message: "Product name, SKU, brand, category, unit, price, MOQ, stock, lead time, and valid manufacturing/expiry dates are required" });
      if (product.sku !== currentSku && supplier.products.some((item) => item.sku === product.sku)) return res.status(409).json({ message: "SKU already exists in supplier catalog" });
      product.supplierId = supplier._id;
      product.organizationId = auth.orgId;
      supplier.products[index] = product;
      await supplier.save();
      return res.json({ message: "Supplier product updated successfully", product: supplier.products[index] });
    } catch (error) {
      console.error("Update supplier product error:", error);
      return res.status(500).json({ message: "Failed to update supplier product" });
    }
  }
);

router.delete(
  "/me/products/:sku",
  requireRole("org:supplier"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const supplier = await Supplier.findOne({ organizationId: auth.orgId, clerkUserId: auth.userId, active: true });
      if (!supplier) return res.status(404).json({ message: "Supplier profile not found" });
      const product = supplier.products.find((item) => item.sku === req.params.sku.trim().toUpperCase());
      if (!product) return res.status(404).json({ message: "Supplier product not found" });
      product.active = false;
      product.availableQuantity = 0;
      await supplier.save();
      return res.json({ message: "Supplier product deactivated successfully", product });
    } catch (error) {
      console.error("Deactivate supplier product error:", error);
      return res.status(500).json({ message: "Failed to deactivate supplier product" });
    }
  }
);

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
  "/admin/approvals",
  requireRole("org:admin"),
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
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        message: "Supplier approvals fetched successfully",
        suppliers: suppliers.map((supplier) => ({
          id: supplier._id,
          supplierId: supplier._id,
          supplierName: supplier.supplierName,
          businessName: supplier.businessName || supplier.supplierName,
          contactPerson: supplier.contactPerson || null,
          email: supplier.email || null,
          phone: supplier.phone || null,
          city: supplier.city || supplier.address?.city || null,
          state: supplier.state || supplier.address?.state || null,
          country: supplier.country || supplier.address?.country || null,
          leadTimeDays: supplier.leadTimeDays,
          reliabilityScore: supplier.reliabilityScore,
          rating: supplier.rating,
          active: supplier.active,
          approvalStatus: supplier.approvalStatus || "PENDING",
          approvalReason: supplier.approvalReason || null,
          approvedAt: supplier.approvedAt || null,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        })),
      });
    } catch (error) {
      console.error("Fetch supplier approvals error:", error);
      return res.status(500).json({
        message: "Failed to fetch supplier approvals",
        error: error.message,
      });
    }
  }
);

router.patch(
  "/admin/:id/approval",
  requireRole("org:admin"),
  async (req, res) => {
    try {
      const auth = getAuth(req);
      const { status, reason } = req.body || {};
      const normalizedStatus = String(status || "").trim().toUpperCase();

      if (!auth.orgId) {
        return res.status(400).json({
          message: "Organization not found",
        });
      }

      if (!["APPROVED", "REJECTED"].includes(normalizedStatus)) {
        return res.status(400).json({
          message: "approval status must be APPROVED or REJECTED",
        });
      }

      const supplier = await Supplier.findOne({
        _id: req.params.id,
        organizationId: auth.orgId,
      });

      if (!supplier) {
        return res.status(404).json({
          message: "Supplier not found",
        });
      }

      supplier.approvalStatus = normalizedStatus;
      supplier.approvalReason = normalizedStatus === "APPROVED" ? null : (String(reason || "").trim() || "Supplier profile did not meet approval requirements.");
      supplier.approvedAt = normalizedStatus === "APPROVED" ? new Date() : null;
      supplier.active = normalizedStatus === "APPROVED";
      await supplier.save();

      return res.status(200).json({
        message: `Supplier ${normalizedStatus.toLowerCase()} successfully`,
        supplier: {
          id: supplier._id,
          supplierName: supplier.supplierName,
          approvalStatus: supplier.approvalStatus,
          approvalReason: supplier.approvalReason,
          approvedAt: supplier.approvedAt,
          active: supplier.active,
        },
      });
    } catch (error) {
      console.error("Update supplier approval error:", error);
      return res.status(500).json({
        message: "Failed to update supplier approval",
        error: error.message,
      });
    }
  }
);

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
        active: true,
        approvalStatus: "APPROVED",
        products: {
          $elemMatch: {
            active: { $ne: false },
            availableQuantity: { $gt: 0 },
          },
        },
      })
        .sort({
          supplierName: 1,
        })
        .lean();

      const visibleSuppliers = suppliers
        .filter(hasMarketplaceIdentity)
        .map((supplier) => ({
        ...marketplaceSupplier(supplier),
        products: (supplier.products || []).filter(
          (product) => product.active !== false && product.availableQuantity > 0
        ),
        }));

      return res.status(200).json({
        message:
          "Suppliers fetched successfully",

        count: visibleSuppliers.length,

        suppliers: visibleSuppliers,
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
          normalizedSku,
          auth.userId
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
          active: true,
          approvalStatus: "APPROVED",
          products: {
            $elemMatch: {
              sku: normalizedSku,
              active: { $ne: false },
              availableQuantity: { $gt: 0 },
            },
          },
        }).lean();

      const matchingSuppliers = [];

      for (const supplier of suppliers) {
        if (!hasMarketplaceIdentity(supplier)) continue;
        const product =
          supplier.products.find(
            (item) =>
              item.sku === normalizedSku &&
              item.active !== false &&
              item.availableQuantity > 0
          );

        if (product) {
          matchingSuppliers.push({
            supplierId:
              supplier._id,

            supplierName:
              supplier.supplierName,

            businessName:
              supplier.businessName || supplier.supplierName,

            contactPerson:
              supplier.contactPerson,

            email:
              supplier.email,

            phone:
              supplier.phone,

            address:
              supplier.address,

            addressLine1:
              supplier.addressLine1 || supplier.address?.addressLine1 || supplier.address?.line1 || null,

            addressLine2:
              supplier.addressLine2 || supplier.address?.addressLine2 || supplier.address?.line2 || null,

            city:
              supplier.city || supplier.address?.city || null,

            state:
              supplier.state || supplier.address?.state || null,

            pincode:
              supplier.pincode || supplier.address?.pincode || supplier.address?.postalCode || null,

            country:
              supplier.country || supplier.address?.country || null,

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