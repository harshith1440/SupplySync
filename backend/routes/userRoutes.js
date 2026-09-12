const express = require("express");
const { getAuth, clerkClient } = require("@clerk/express");

const router = express.Router();

router.post("/role", async (req, res) => {
  try {
    const auth = getAuth(req);

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

    const organizationId = process.env.CLERK_ORGANIZATION_ID;

    if (!organizationId) {
      return res.status(500).json({
        message: "CLERK_ORGANIZATION_ID is missing",
      });
    }

    const clerkRole = roleMap[role];

    const membership =
      await clerkClient.organizations.createOrganizationMembership({
        organizationId,
        userId: auth.userId,
        role: clerkRole,
      });

    return res.status(200).json({
      message: "Role assigned successfully",
      role: membership.role,
      organizationId,
    });
  } catch (error) {
    console.error("Role assignment error:", error);

    return res.status(500).json({
      message: "Failed to assign role",
      error: error.message,
    });
  }
});

module.exports = router;