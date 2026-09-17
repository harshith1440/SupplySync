require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { clerkMiddleware } = require("@clerk/express");

const Inventory = require("./models/Inventory");
const Sale = require("./models/Sale");
const SupplierFeedback = require("./models/SupplierFeedback");

const adminTransactionRoutes = require("./routes/adminTransactionRoutes");
const testRoutes = require("./routes/testRoutes");
const userRoutes = require("./routes/userRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const saleRoutes = require("./routes/saleRoutes");
const expiryRoutes = require("./routes/expiryRoutes");
const forecastRoutes = require("./routes/forecastRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const payoutRoutes = require("./routes/payoutRoutes");
const supplierDashboardRoutes = require("./routes/supplierDashboardRoutes");
const billRoutes = require("./routes/billRoutes");

const app = express();

// CORS
const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(clerkMiddleware());

// API Routes
app.use("/api/test", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/expiry", expiryRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/payouts", payoutRoutes);

app.use(
  "/api/supplier-dashboard",
  supplierDashboardRoutes
);

app.use(
  "/api/admin/transactions",
  adminTransactionRoutes
);

app.use(
  "/api/admin",
  adminTransactionRoutes
);

// Root Route
app.get("/", (req, res) => {
  res.json({
    message: "SupplySync API is running",
  });
});

// Railway provides PORT.
// Local development falls back to 5000.
const PORT = process.env.PORT || 5000;

// Start Server
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);

    await Inventory.syncIndexes();
    await Sale.syncIndexes();
    await SupplierFeedback.syncIndexes();

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`SupplySync API running on port ${PORT}`);
      console.log(
        `Environment: ${process.env.NODE_ENV || "development"}`
      );
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();