const mongoose = require("mongoose");
require("dotenv").config();

const Inventory = require("../models/Inventory");

const {
  getSupplierRecommendation,
} = require("../services/supplierService");

async function testSupplierService() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected successfully."
    );

    const inventory =
      await Inventory.findOne({}).lean();

    if (!inventory) {
      throw new Error(
        "No inventory product found"
      );
    }

    const organizationId =
      inventory.organizationId;

    const sku = inventory.sku;

    const requiredQuantity = 31;

    console.log("");

    console.log(
      `Organization: ${organizationId}`
    );

    console.log(
      `Testing supplier recommendation for ${sku}`
    );

    console.log(
      `Required quantity: ${requiredQuantity}`
    );

    const recommendation =
      await getSupplierRecommendation(
        organizationId,
        sku,
        requiredQuantity
      );

    console.log("");

    console.log(
      "Recommended Supplier:"
    );

    console.log(
      recommendation
        .recommendedSupplier
        .supplierName
    );

    console.log(
      `Score: ${
        recommendation
          .recommendedSupplier
          .score
      }`
    );

    console.log(
      `Product: ${
        recommendation
          .recommendedSupplier
          .recommendedProduct
          .productName
      }`
    );

    console.log(
      `Price: ₹${
        recommendation
          .recommendedSupplier
          .recommendedProduct
          .unitPrice
      }`
    );

    console.log(
      `Lead time: ${
        recommendation
          .recommendedSupplier
          .leadTimeDays
      } days`
    );

    console.log("");

    console.log("Reasons:");

    recommendation
      .recommendedSupplier
      .reasons
      .forEach((reason) => {
        console.log(`✓ ${reason}`);
      });

    console.log("");

    console.log(
      "Supplier comparison:"
    );

    recommendation.supplierComparison.forEach(
      (supplier, index) => {
        console.log(
          `${index + 1}. ${
            supplier.supplierName
          } → Score: ${
            supplier.finalScore
          }`
        );
      }
    );

    console.log("");

    console.log(
      "Supplier service test completed successfully."
    );
  } catch (error) {
    console.error(
      "Supplier service test failed:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

testSupplierService();