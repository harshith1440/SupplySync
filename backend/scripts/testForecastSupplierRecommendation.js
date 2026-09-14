const mongoose = require("mongoose");
require("dotenv").config();

const Inventory = require("../models/Inventory");

const {
  getForecastBasedSupplierRecommendation,
} = require("../services/supplierService");

async function testForecastSupplierRecommendation() {
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
        "No inventory product found."
      );
    }

    const organizationId =
      inventory.organizationId;

    const sku = inventory.sku;

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "FORECAST + SUPPLIER RECOMMENDATION TEST"
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      `Product: ${inventory.productName}`
    );

    console.log(
      `SKU: ${sku}`
    );

    console.log(
      `Current stock: ${inventory.quantity}`
    );

    console.log("");

    const result =
      await getForecastBasedSupplierRecommendation(
        organizationId,
        sku
      );

    console.log(
      "Forecast demand:",
      result.forecastDemand
    );

    console.log(
      "Safety stock:",
      result.safetyStock
    );

    console.log(
      "Required quantity:",
      result.requiredQuantity
    );

    console.log(
      "Order required:",
      result.orderRequired
    );

    console.log("");

    console.log(
      "7-Day Forecast:"
    );

    result.forecast.forEach(
      (day) => {
        console.log(
          `${day.date} → ${day.predictedDemand} units`
        );
      }
    );

    console.log("");

    if (result.orderRequired) {
      console.log(
        "========================================"
      );

      console.log(
        "RECOMMENDED SUPPLIER"
      );

      console.log(
        "========================================"
      );

      console.log(
        `Supplier: ${
          result
            .recommendedSupplier
            .supplierName
        }`
      );

      console.log(
        `Score: ${
          result
            .recommendedSupplier
            .score
        }`
      );

      console.log(
        `Price: ₹${
          result
            .recommendedSupplier
            .recommendedProduct
            .unitPrice
        }`
      );

      console.log(
        `Lead time: ${
          result
            .recommendedSupplier
            .leadTimeDays
        } days`
      );

      console.log(
        `Available quantity: ${
          result
            .recommendedSupplier
            .recommendedProduct
            .availableQuantity
        }`
      );

      console.log("");

      console.log(
        "Reasons:"
      );

      result
        .recommendedSupplier
        .reasons
        .forEach((reason) => {
          console.log(
            `✓ ${reason}`
          );
        });

      console.log("");

      console.log(
        "Alternatives:"
      );

      result.alternatives.forEach(
        (supplier, index) => {
          console.log(
            `${index + 1}. ${
              supplier.supplierName
            } → Score: ${
              supplier.score
            }`
          );
        }
      );
    } else {
      console.log(
        "No purchase required."
      );

      console.log(
        result.message
      );
    }

    console.log("");

    console.log(
      "Forecast + supplier recommendation test completed successfully."
    );
  } catch (error) {
    console.error(
      "Forecast + supplier recommendation test failed:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

testForecastSupplierRecommendation();