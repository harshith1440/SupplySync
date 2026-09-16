const express = require("express");
const { getAuth, clerkClient } = require("@clerk/express");
const RetailerProfile = require("../models/RetailerProfile");
const Supplier = require("../models/Supplier");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function getMembershipOrganizationId(membership) {
  return membership.organization?.id || membership.organizationId || null;
}

async function resolveOrganization(auth, clerkUser) {
  if (auth.orgId) {
    const memberships = await clerkClient.users.getOrganizationMembershipList({
      userId: auth.userId,
    });
    const activeMembership = memberships.data?.find(
      (membership) => getMembershipOrganizationId(membership) === auth.orgId
    );

    return {
      organizationId: auth.orgId,
      membership: activeMembership || null,
      created: false,
    };
  }

  const memberships = await clerkClient.users.getOrganizationMembershipList({
    userId: auth.userId,
  });
  const configuredOrganizationId =
    process.env.CLERK_ORGANIZATION_ID?.trim() || null;

  let supplySyncOrganizationId = configuredOrganizationId;

  if (!supplySyncOrganizationId) {
    const organizations = await clerkClient.organizations.getOrganizationList({
      query: "SupplySync AI",
      limit: 100,
    });
    const existingSupplySyncOrganization = organizations.data?.find(
      (organization) => organization.name === "SupplySync AI"
    );
    supplySyncOrganizationId = existingSupplySyncOrganization?.id || null;
  }

  if (supplySyncOrganizationId) {
    try {
      await clerkClient.organizations.getOrganization({
        organizationId: supplySyncOrganizationId,
      });
    } catch (error) {
      throw new Error(
        `SupplySync organization ${supplySyncOrganizationId} could not be loaded: ${error.message}`
      );
    }

    const configuredMembership = memberships.data?.find(
      (membership) =>
        getMembershipOrganizationId(membership) === supplySyncOrganizationId
    );

    return {
      organizationId: supplySyncOrganizationId,
      membership: configuredMembership || null,
      created: false,
    };
  }

  const existingMembership = memberships.data?.[0];

  if (existingMembership) {
    return {
      organizationId: getMembershipOrganizationId(existingMembership),
      membership: existingMembership,
      created: false,
    };
  }

  const organization = await clerkClient.organizations.createOrganization({
    name: "SupplySync AI",
    createdBy: auth.userId,
  });

  return {
    organizationId: organization.id,
    membership: null,
    created: true,
  };
}

async function assignRole(organizationId, userId, requestedRole, membership, organizationCreated) {
  if (membership && !organizationCreated) {
    return membership.role;
  }

  const assignedMembership = membership || organizationCreated
    ? await clerkClient.organizations.updateOrganizationMembership({
        organizationId,
        userId,
        role: requestedRole,
      })
    : await clerkClient.organizations.createOrganizationMembership({
        organizationId,
        userId,
        role: requestedRole,
      });

  return assignedMembership.role;
}

async function createOrUpdateRoleProfile({ organizationId, userId, role, clerkUser }) {
  const email = clerkUser.primaryEmailAddress?.emailAddress || null;
  const name = clerkUser.fullName || clerkUser.username || email || null;

  if (role === "org:retailer") {
    return RetailerProfile.findOneAndUpdate(
      { organizationId, clerkUserId: userId },
      {
        $setOnInsert: {
          organizationId,
          clerkUserId: userId,
          name,
          businessName: name,
          contactPerson: name,
          email,
          active: false,
          approvalStatus: "PENDING",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  if (role === "org:supplier") {
    return Supplier.findOneAndUpdate(
      { organizationId, clerkUserId: userId },
      {
        $setOnInsert: {
          organizationId,
          clerkUserId: userId,
          supplierName: name || "New Supplier",
          contactPerson: name,
          email,
          products: [],
          leadTimeDays: 0,
          reliabilityScore: 0,
          rating: 0,
          active: false,
          approvalStatus: "PENDING",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  return null;
}

function getRoleProfilePayload(body, role, clerkUser) {
  const profile = body.profile || {};
  const email = String(profile.email || clerkUser.primaryEmailAddress?.emailAddress || "").trim().toLowerCase();
  const name = String(profile.name || profile.businessName || clerkUser.fullName || clerkUser.username || "").trim();
  const contactPerson = String(profile.contactPerson || name).trim();
  const address = profile.address || {};

  return {
    email,
    supplier: role === "supplier" ? {
      supplierName: String(profile.supplierName || name).trim(),
      businessName: String(profile.businessName || profile.supplierName || name).trim(),
      contactPerson,
      email,
      phone: String(profile.phone || "").trim(),
      address,
      addressLine1: address.addressLine1 || address.line1 || null,
      addressLine2: address.addressLine2 || address.line2 || null,
      city: address.city || null,
      state: address.state || null,
      pincode: address.pincode || address.postalCode || null,
      country: address.country || "India",
    } : null,
    retailer: role === "retailer" ? {
      name,
      businessName: String(profile.businessName || name).trim(),
      contactPerson,
      email,
      phone: String(profile.phone || "").trim(),
      address,
    } : null,
  };
}

router.get("/profile", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ message: "Authentication required" });
    if (!auth.orgId) return res.status(400).json({ message: "Organization not found" });
    const profile = await RetailerProfile.findOne({ organizationId: auth.orgId, clerkUserId: auth.userId }).lean();
    return res.json({ profile: profile || null });
  } catch (error) {
    console.error("Fetch retailer profile error:", error);
    return res.status(500).json({ message: "Failed to fetch retailer profile" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ message: "Authentication required" });
    if (!auth.orgId) return res.status(400).json({ message: "Organization not found" });
    const { name, email, phone, address, deliveryAddress } = req.body;
    const sourceAddress = deliveryAddress || address || {};
    const normalizedAddress = {
      businessName: sourceAddress.businessName || req.body.businessName || name || null,
      contactPerson: sourceAddress.contactPerson || req.body.contactPerson || name || null,
      phone: sourceAddress.phone || phone || null,
      addressLine1: sourceAddress.addressLine1 || sourceAddress.line1 || req.body.addressLine1 || null,
      addressLine2: sourceAddress.addressLine2 || sourceAddress.line2 || req.body.addressLine2 || null,
      city: sourceAddress.city || null,
      state: sourceAddress.state || null,
      pincode: sourceAddress.pincode || sourceAddress.postalCode || req.body.pincode || null,
      country: sourceAddress.country || "India",
    };
    const profile = await RetailerProfile.findOneAndUpdate(
      { organizationId: auth.orgId, clerkUserId: auth.userId },
      {
        $set: {
          name,
          email,
          phone,
          businessName: req.body.businessName || normalizedAddress.businessName,
          contactPerson: req.body.contactPerson || normalizedAddress.contactPerson,
          address: normalizedAddress,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ message: "Retailer profile saved successfully", profile });
  } catch (error) {
    console.error("Save retailer profile error:", error);
    return res.status(500).json({ message: "Failed to save retailer profile" });
  }
});

router.post("/role", async (req, res) => {
  try {
    const auth = getAuth(req);

    console.log("Role onboarding request", {
      userId: auth.userId || null,
      organizationId: auth.orgId || null,
      role: req.body?.role || null,
      authenticated: Boolean(auth.isAuthenticated),
    });

    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { role } = req.body;

    const roleMap = {
      retailer: "org:retailer",
      supplier: "org:supplier",
    };

    if (!roleMap[role]) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const clerkRole = roleMap[role];
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const resolvedOrganization = await resolveOrganization(auth, clerkUser);

    if (!resolvedOrganization.organizationId) {
      return res.status(500).json({
        message: "Unable to resolve organization",
      });
    }

    const assignedRole = await assignRole(
      resolvedOrganization.organizationId,
      auth.userId,
      clerkRole,
      resolvedOrganization.membership,
      resolvedOrganization.created
    );

    const roleProfile = await createOrUpdateRoleProfile({
      organizationId: resolvedOrganization.organizationId,
      userId: auth.userId,
      role: assignedRole,
      clerkUser,
    });

    const profilePayload = getRoleProfilePayload(req.body, role, clerkUser);
    if (role === "supplier" && profilePayload.supplier && Object.keys(profilePayload.supplier).length > 0) {
      await Supplier.findOneAndUpdate(
        { organizationId: resolvedOrganization.organizationId, clerkUserId: auth.userId },
        { $set: profilePayload.supplier },
        { new: true, runValidators: true }
      );
    }
    if (role === "retailer" && profilePayload.retailer) {
      await RetailerProfile.findOneAndUpdate(
        { organizationId: resolvedOrganization.organizationId, clerkUserId: auth.userId },
        { $set: { ...profilePayload.retailer, active: false, approvalStatus: "PENDING" } },
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      message: "Role assigned successfully",
      role: assignedRole,
      organizationId: resolvedOrganization.organizationId,
    });
  } catch (error) {
    console.error("Role assignment error:", {
      message: error.message,
      status: error.status || error.statusCode || 500,
      code: error.code || null,
      cause: error.errors || null,
    });

    return res.status(500).json({
      message: "Failed to assign role",
      error: error.message,
      code: error.code || null,
    });
  }
});

router.get("/admin/users", requireRole("org:admin"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const organizationId = auth.orgId || process.env.CLERK_ORGANIZATION_ID;

    // Fetch all registered users from Clerk and organization memberships
    const [clerkUsersRes, membershipsRes, retailerProfiles, supplierProfiles] = await Promise.all([
      clerkClient.users.getUserList({ limit: 200 }),
      organizationId
        ? clerkClient.organizations.getOrganizationMembershipList({ organizationId, limit: 200 }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      RetailerProfile.find({}).lean(),
      Supplier.find({}).lean(),
    ]);

    const membershipByUserId = new Map(
      (membershipsRes.data || []).map((m) => [m.publicUserData?.userId || m.userId, m])
    );
    const retailerByUserId = new Map(retailerProfiles.map((r) => [r.clerkUserId, r]));
    const supplierByUserId = new Map(
      supplierProfiles.filter((s) => s.clerkUserId).map((s) => [s.clerkUserId, s])
    );

    const users = (clerkUsersRes.data || []).map((user) => {
      const membership = membershipByUserId.get(user.id);
      const retailer = retailerByUserId.get(user.id);
      const supplier = supplierByUserId.get(user.id);

      const role = membership?.role || (retailer ? "org:retailer" : supplier ? "org:supplier" : "unassigned");

      let approvalStatus = "APPROVED";
      if (role === "org:retailer") {
        approvalStatus = retailer?.approvalStatus || "PENDING";
      } else if (role === "org:supplier") {
        approvalStatus = supplier?.approvalStatus || "PENDING";
      } else if (role === "org:admin") {
        approvalStatus = "APPROVED";
      } else {
        approvalStatus = "PENDING_ROLE";
      }

      const email = user.primaryEmailAddress?.emailAddress || retailer?.email || supplier?.email || null;
      const name =
        user.fullName ||
        user.username ||
        retailer?.businessName ||
        retailer?.name ||
        supplier?.businessName ||
        supplier?.supplierName ||
        email ||
        user.id;

      return {
        userId: user.id,
        name,
        email,
        role,
        approvalStatus,
        active: retailer ? Boolean(retailer.active) : supplier ? Boolean(supplier.active) : true,
        createdAt: user.createdAt || membership?.createdAt || retailer?.createdAt || supplier?.createdAt || null,
      };
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Get admin users error:", error);
    return res.status(500).json({ message: "Failed to fetch registered users", error: error.message });
  }
});

router.get("/admin/retailers", requireRole("org:admin"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const organizationId = auth.orgId || process.env.CLERK_ORGANIZATION_ID;
    const query = organizationId
      ? { $or: [{ organizationId }, { organizationId: { $exists: true } }] }
      : {};

    const retailers = await RetailerProfile.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      retailers: retailers.map((retailer) => ({
        id: retailer._id,
        retailerId: retailer._id,
        clerkUserId: retailer.clerkUserId,
        name: retailer.name || retailer.businessName || "Retailer",
        businessName: retailer.businessName || retailer.name || "Retailer",
        contactPerson: retailer.contactPerson || retailer.address?.contactPerson || retailer.name || null,
        email: retailer.email || retailer.address?.email || null,
        phone: retailer.phone || retailer.address?.phone || null,
        address: retailer.address || null,
        city: retailer.address?.city || null,
        state: retailer.address?.state || null,
        pincode: retailer.address?.pincode || retailer.address?.postalCode || null,
        country: retailer.address?.country || "India",
        approvalStatus: retailer.approvalStatus || "PENDING",
        approvalReason: retailer.approvalReason || null,
        approvedAt: retailer.approvedAt || null,
        active: Boolean(retailer.active),
        createdAt: retailer.createdAt,
        updatedAt: retailer.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get admin retailers error:", error);
    return res.status(500).json({ message: "Failed to fetch retailers", error: error.message });
  }
});

router.patch("/admin/retailers/:id/approval", requireRole("org:admin"), async (req, res) => {
  try {
    const auth = getAuth(req);

    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { status, reason } = req.body || {};
    const normalizedStatus = String(status || "").trim().toUpperCase();

    if (!["APPROVED", "REJECTED"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "approval status must be APPROVED or REJECTED" });
    }

    const retailer = await RetailerProfile.findOne({ _id: req.params.id });
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    retailer.approvalStatus = normalizedStatus;
    retailer.approvalReason =
      normalizedStatus === "APPROVED"
        ? null
        : String(reason || "").trim() || "Retailer profile did not meet approval requirements.";
    retailer.approvedAt = normalizedStatus === "APPROVED" ? new Date() : null;
    retailer.active = normalizedStatus === "APPROVED";
    await retailer.save();

    return res.status(200).json({
      message: `Retailer ${normalizedStatus.toLowerCase()} successfully`,
      retailer: {
        id: retailer._id,
        name: retailer.name || retailer.businessName,
        approvalStatus: retailer.approvalStatus,
        approvalReason: retailer.approvalReason,
        approvedAt: retailer.approvedAt,
        active: retailer.active,
      },
    });
  } catch (error) {
    console.error("Update retailer approval error:", error);
    return res.status(500).json({ message: "Failed to update retailer approval", error: error.message });
  }
});

module.exports = router;