const { spawn } = require("child_process");

const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");

const {
  recommendSuppliers,
} = require("./supplierRecommendation");

const PYTHON_COMMAND = "python3";

const FORECAST_SCRIPT =
  "forecasting/predict.py";

const SAFETY_STOCK = 10;

function runPythonForecast(sku) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      PYTHON_COMMAND,
      [
        FORECAST_SCRIPT,
        sku,
        "--json",
      ],
      {
        cwd: process.cwd(),
      }
    );

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on(
      "data",
      (data) => {
        stdout += data.toString();
      }
    );

    pythonProcess.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    pythonProcess.on(
      "error",
      (error) => {
        reject(
          new Error(
            `Failed to start Python forecast: ${error.message}`
          )
        );
      }
    );

    pythonProcess.on(
      "close",
      (code) => {
        if (code !== 0) {
          console.error(
            "Python forecast error:",
            stderr
          );

          return reject(
            new Error(
              "Demand forecast failed"
            )
          );
        }

        try {
          const forecast =
            JSON.parse(stdout);

          resolve(forecast);
        } catch (error) {
          console.error(
            "Invalid Python forecast output:",
            stdout
          );

          reject(
            new Error(
              "Failed to parse demand forecast"
            )
          );
        }
      }
    );
  });
}

function calculateRequiredQuantity(
  currentStock,
  forecast
) {
  const forecastDemand =
    forecast.forecast.reduce(
      (total, day) =>
        total + day.predictedDemand,
      0
    );

  const requiredQuantity =
    Math.ceil(
      forecastDemand +
        SAFETY_STOCK -
        currentStock
    );

  return {
    forecastDemand: Number(
      forecastDemand.toFixed(2)
    ),

    safetyStock: SAFETY_STOCK,

    requiredQuantity: Math.max(
      0,
      requiredQuantity
    ),
  };
}

async function getSupplierRecommendation(
  organizationId,
  sku,
  requiredQuantity
) {
  if (!organizationId) {
    throw new Error(
      "Organization ID is required"
    );
  }

  if (!sku) {
    throw new Error(
      "SKU is required"
    );
  }

  if (
    !requiredQuantity ||
    requiredQuantity <= 0
  ) {
    throw new Error(
      "Required quantity must be greater than zero"
    );
  }

  const normalizedSku =
    sku.toUpperCase();

  const suppliers =
    await Supplier.find({
      organizationId,
      active: true,
    }).lean();

  const supplierProducts = [];

  for (const supplier of suppliers) {
    const product =
      supplier.products.find(
        (item) =>
          item.sku === normalizedSku
      );

    if (product) {
      supplierProducts.push({
        supplier,
        product,
      });
    }
  }

  if (
    supplierProducts.length === 0
  ) {
    throw new Error(
      `No active suppliers found for SKU ${normalizedSku}`
    );
  }

  return recommendSuppliers(
    supplierProducts,
    requiredQuantity
  );
}

async function getSuppliersForSku(
  organizationId,
  sku
) {
  if (!organizationId) {
    throw new Error(
      "Organization ID is required"
    );
  }

  if (!sku) {
    throw new Error(
      "SKU is required"
    );
  }

  const normalizedSku =
    sku.toUpperCase();

  const suppliers =
    await Supplier.find({
      organizationId,
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

  return matchingSuppliers;
}

async function getForecastBasedSupplierRecommendation(
  organizationId,
  sku
) {
  if (!organizationId) {
    throw new Error(
      "Organization ID is required"
    );
  }

  if (!sku) {
    throw new Error(
      "SKU is required"
    );
  }

  const normalizedSku =
    sku.toUpperCase();

  /*
    1. Get current inventory
  */

  const inventory =
    await Inventory.findOne({
      organizationId,
      sku: normalizedSku,
    }).lean();

  if (!inventory) {
    throw new Error(
      `Inventory not found for SKU ${normalizedSku}`
    );
  }

  /*
    2. Get ML forecast
  */

  const forecast =
    await runPythonForecast(
      normalizedSku
    );

  /*
    3. Calculate required quantity
  */

  const quantityCalculation =
    calculateRequiredQuantity(
      inventory.quantity,
      forecast
    );

  /*
    4. If current stock + forecast
       already covers demand and
       safety stock, no order needed.
  */

  if (
    quantityCalculation.requiredQuantity <=
    0
  ) {
    return {
      sku: normalizedSku,

      productName:
        inventory.productName,

      currentStock:
        inventory.quantity,

      forecastDemand:
        quantityCalculation.forecastDemand,

      safetyStock:
        quantityCalculation.safetyStock,

      requiredQuantity: 0,

      orderRequired: false,

      forecast: forecast.forecast,

      message:
        "Current inventory is sufficient for the forecast period.",
    };
  }

  /*
    5. Get supplier recommendation
  */

  const recommendation =
    await getSupplierRecommendation(
      organizationId,
      normalizedSku,
      quantityCalculation.requiredQuantity
    );

  /*
    6. Return complete decision
  */

  return {
    sku: normalizedSku,

    productName:
      inventory.productName,

    category:
      inventory.category,

    currentStock:
      inventory.quantity,

    reorderLevel:
      inventory.reorderLevel,

    forecastDemand:
      quantityCalculation.forecastDemand,

    safetyStock:
      quantityCalculation.safetyStock,

    requiredQuantity:
      quantityCalculation.requiredQuantity,

    orderRequired: true,

    forecast:
      forecast.forecast,

    recommendedSupplier:
      recommendation.recommendedSupplier,

    alternatives:
      recommendation.alternatives,

    supplierComparison:
      recommendation.supplierComparison,
  };
}

module.exports = {
  getSupplierRecommendation,
  getSuppliersForSku,
  getForecastBasedSupplierRecommendation,
};