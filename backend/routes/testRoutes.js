const express = require("express");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.get("/admin", requireRole("org:admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

router.get("/retailer", requireRole("org:retailer"), (req, res) => {
  res.json({ message: "Retailer access granted" });
});

router.get("/supplier", requireRole("org:supplier"), (req, res) => {
  res.json({ message: "Supplier access granted" });
});

module.exports = router;