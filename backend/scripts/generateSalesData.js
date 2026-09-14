const mongoose = require("mongoose");
require("dotenv").config();

const Inventory = require("../models/Inventory");
const Sale = require("../models/Sale");

const DAYS_TO_GENERATE = 365;

const FESTIVALS = [
  {
    name: "Dussehra",
    date: "2025-10-02",
    multiplier: 1.25,
  },
  {
    name: "Diwali",
    date: "2025-10-20",
    multiplier: 1.55,
  },
  {
    name: "Holi",
    date: "2026-03-04",
    multiplier: 1.35,
  },
  {
    name: "Ugadi",
    date: "2026-03-19",
    multiplier: 1.25,
  },
  {
    name: "Eid",
    date: "2026-03-20",
    multiplier: 1.3,
  },
];

const PRODUCT_PROFILES = {
  milk: {
    baseDemand: 8,
    weekendMultiplier: 1.15,
    volatility: 0.18,
    festivalMultiplier: 1.1,
    promotionProbability: 0.05,
  },

  bread: {
    baseDemand: 7,
    weekendMultiplier: 1.2,
    volatility: 0.2,
    festivalMultiplier: 1.05,
    promotionProbability: 0.05,
  },

  rice: {
    baseDemand: 4,
    weekendMultiplier: 1.1,
    volatility: 0.25,
    festivalMultiplier: 1.35,
    promotionProbability: 0.08,
  },

  atta: {
    baseDemand: 4,
    weekendMultiplier: 1.1,
    volatility: 0.22,
    festivalMultiplier: 1.3,
    promotionProbability: 0.08,
  },

  flour: {
    baseDemand: 4,
    weekendMultiplier: 1.1,
    volatility: 0.22,
    festivalMultiplier: 1.3,
    promotionProbability: 0.08,
  },

  oil: {
    baseDemand: 3,
    weekendMultiplier: 1.08,
    volatility: 0.25,
    festivalMultiplier: 1.35,
    promotionProbability: 0.08,
  },

  biscuit: {
    baseDemand: 6,
    weekendMultiplier: 1.25,
    volatility: 0.2,
    festivalMultiplier: 1.2,
    promotionProbability: 0.12,
  },

  chocolate: {
    baseDemand: 5,
    weekendMultiplier: 1.3,
    volatility: 0.25,
    festivalMultiplier: 1.35,
    promotionProbability: 0.12,
  },

  chips: {
    baseDemand: 5,
    weekendMultiplier: 1.3,
    volatility: 0.25,
    festivalMultiplier: 1.2,
    promotionProbability: 0.1,
  },

  soap: {
    baseDemand: 2,
    weekendMultiplier: 1.05,
    volatility: 0.3,
    festivalMultiplier: 1.1,
    promotionProbability: 0.08,
  },

  shampoo: {
    baseDemand: 2,
    weekendMultiplier: 1.08,
    volatility: 0.3,
    festivalMultiplier: 1.15,
    promotionProbability: 0.08,
  },

  detergent: {
    baseDemand: 2,
    weekendMultiplier: 1.05,
    volatility: 0.3,
    festivalMultiplier: 1.2,
    promotionProbability: 0.1,
  },

  toothpaste: {
    baseDemand: 2,
    weekendMultiplier: 1.05,
    volatility: 0.3,
    festivalMultiplier: 1.1,
    promotionProbability: 0.05,
  },

  water: {
    baseDemand: 5,
    weekendMultiplier: 1.25,
    volatility: 0.2,
    festivalMultiplier: 1.1,
    promotionProbability: 0.05,
  },

  softdrink: {
    baseDemand: 5,
    weekendMultiplier: 1.35,
    volatility: 0.25,
    festivalMultiplier: 1.2,
    promotionProbability: 0.12,
  },

  juice: {
    baseDemand: 4,
    weekendMultiplier: 1.3,
    volatility: 0.25,
    festivalMultiplier: 1.15,
    promotionProbability: 0.1,
  },

  generic: {
    baseDemand: 2,
    weekendMultiplier: 1.1,
    volatility: 0.3,
    festivalMultiplier: 1.15,
    promotionProbability: 0.08,
  },
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function getProductProfile(productName) {
  const name = normalizeText(productName);

  const profileKeys = Object.keys(PRODUCT_PROFILES);

  for (const key of profileKeys) {
    if (name.includes(key)) {
      return PRODUCT_PROFILES[key];
    }
  }

  return PRODUCT_PROFILES.generic;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFestival(date) {
  const currentDate = new Date(date);

  let strongestFestival = null;
  let strongestMultiplier = 1;

  for (const festival of FESTIVALS) {
    const festivalDate = new Date(`${festival.date}T00:00:00`);

    const difference =
      Math.abs(currentDate.getTime() - festivalDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference <= 3 && festival.multiplier > strongestMultiplier) {
      strongestFestival = festival.name;
      strongestMultiplier = festival.multiplier;
    }
  }

  return {
    name: strongestFestival,
    multiplier: strongestMultiplier,
  };
}

function getSeasonalMultiplier(date, category, productName) {
  const month = new Date(date).getMonth() + 1;

  const normalizedCategory = normalizeText(category);
  const normalizedProduct = normalizeText(productName);

  let multiplier = 1;

  // Summer: April-June
  if (month >= 4 && month <= 6) {
    if (
      normalizedProduct.includes("soft") ||
      normalizedProduct.includes("drink") ||
      normalizedProduct.includes("juice") ||
      normalizedProduct.includes("water")
    ) {
      multiplier *= 1.45;
    }
  }

  // Monsoon: July-September
  if (month >= 7 && month <= 9) {
    if (
      normalizedCategory.includes("grocery") ||
      normalizedCategory.includes("snack")
    ) {
      multiplier *= 1.08;
    }
  }

  // Winter: November-January
  if (month === 11 || month === 12 || month === 1) {
    if (
      normalizedProduct.includes("tea") ||
      normalizedProduct.includes("coffee")
    ) {
      multiplier *= 1.2;
    }
  }

  return multiplier;
}

function getTrendMultiplier(date, startDate) {
  const current = new Date(date);
  const start = new Date(startDate);

  const daysPassed =
    (current.getTime() - start.getTime()) /
    (1000 * 60 * 60 * 24);

  // Small gradual demand growth over the year.
  const yearlyGrowth = daysPassed / 365;

  return 1 + yearlyGrowth * 0.08;
}

function calculateDemand({
  product,
  date,
  startDate,
}) {
  const profile = getProductProfile(product.productName);

  const currentDate = new Date(date);

  let demand = profile.baseDemand;

  // Weekend effect
  const dayOfWeek = currentDate.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    demand *= profile.weekendMultiplier;
  }

  // Festival effect
  const festival = getFestival(date);

  if (festival.name) {
    demand *= festival.multiplier;
    demand *= profile.festivalMultiplier;
  }

  // Seasonal effect
  demand *= getSeasonalMultiplier(
    date,
    product.category,
    product.productName
  );

  // Small long-term trend
  demand *= getTrendMultiplier(date, startDate);

  // Random daily variation
  const variation = randomBetween(
    1 - profile.volatility,
    1 + profile.volatility
  );

  demand *= variation;

  return Math.max(0, demand);
}

function shouldPromote(product) {
  const profile = getProductProfile(product.productName);

  return Math.random() < profile.promotionProbability;
}

function getDiscount(promotion) {
  if (!promotion) {
    return 0;
  }

  return randomInteger(5, 20);
}

function getSellingPrice(product) {
  if (
    typeof product.sellingPrice === "number" &&
    product.sellingPrice >= 0
  ) {
    return product.sellingPrice;
  }

  if (
    typeof product.price === "number" &&
    product.price >= 0
  ) {
    return product.price;
  }

  return 0;
}

function createDateWithNoTime(date) {
  const result = new Date(date);

  result.setHours(12, 0, 0, 0);

  return result;
}

async function generateSalesData() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    const products = await Inventory.find({}).lean();

    if (products.length === 0) {
      console.log(
        "No inventory products found. Add products before generating sales."
      );

      return;
    }

    console.log(
      `Found ${products.length} inventory products.`
    );

    const endDate = new Date();

    endDate.setHours(12, 0, 0, 0);

    const startDate = new Date(endDate);

    startDate.setDate(
      startDate.getDate() - (DAYS_TO_GENERATE - 1)
    );

    startDate.setHours(12, 0, 0, 0);

    console.log(
      `Generating ${DAYS_TO_GENERATE} days of sales data.`
    );

    console.log(
      `From ${startDate.toISOString().split("T")[0]}`
    );

    console.log(
      `To ${endDate.toISOString().split("T")[0]}`
    );

    const sales = [];

    for (const product of products) {
      const profile = getProductProfile(
        product.productName
      );

      console.log(
        `Generating sales for ${product.productName} (${product.sku})`
      );

      for (
        let day = 0;
        day < DAYS_TO_GENERATE;
        day++
      ) {
        const saleDate = new Date(startDate);

        saleDate.setDate(
          startDate.getDate() + day
        );

        saleDate.setHours(12, 0, 0, 0);

        const festival = getFestival(saleDate);

        let demand = calculateDemand({
          product,
          date: saleDate,
          startDate,
        });

        /*
         * Slow-moving products should naturally have
         * occasional zero-sales days.
         */
        if (
          profile.baseDemand <= 2 &&
          Math.random() < 0.25
        ) {
          demand = 0;
        }

        /*
         * Some normal products can also have zero-sales
         * days, which makes the dataset more realistic.
         */
        if (
          profile.baseDemand > 2 &&
          Math.random() < 0.04
        ) {
          demand = 0;
        }

        let promotion = shouldPromote(product);

        /*
         * Promotions increase demand.
         */
        if (promotion) {
          demand *= randomBetween(1.15, 1.4);
        }

        const discount = getDiscount(promotion);

        /*
         * Convert continuous demand into integer units.
         */
        let quantitySold = Math.round(demand);

        quantitySold = Math.max(
          0,
          quantitySold
        );

        /*
         * Avoid completely unrealistic huge values.
         */
        const maximumDailySales = Math.max(
          100,
          profile.baseDemand * 8
        );

        quantitySold = Math.min(
          quantitySold,
          maximumDailySales
        );

        /*
         * If there are zero sales, we still keep a
         * record. This is useful for time-series models
         * because zero-demand days matter.
         */
        if (quantitySold === 0) {
          sales.push({
            organizationId: product.organizationId,
            inventoryId: product._id,
            productName: product.productName,
            sku: product.sku,
            category: product.category,
            quantitySold: 0,
            sellingPrice: getSellingPrice(product),
            discount,
            festival: festival.name,
            promotion,
            saleDate: createDateWithNoTime(saleDate),
          });

          continue;
        }

        sales.push({
          organizationId: product.organizationId,
          inventoryId: product._id,
          productName: product.productName,
          sku: product.sku,
          category: product.category,
          quantitySold,
          sellingPrice: getSellingPrice(product),
          discount,
          festival: festival.name,
          promotion,
          saleDate: createDateWithNoTime(saleDate),
        });
      }
    }

    console.log(
      `Generated ${sales.length} sales records.`
    );

    /*
     * Remove previously generated synthetic records
     * for the same organizations before inserting.
     *
     * This prevents duplicate data when the script is
     * accidentally run twice.
     */
    const organizationIds = [
      ...new Set(
        products.map(
          (product) => product.organizationId
        )
      ),
    ];

    const deleteResult = await Sale.deleteMany({
      organizationId: {
        $in: organizationIds,
      },
    });

    console.log(
      `Removed ${deleteResult.deletedCount} existing sales records.`
    );

    if (sales.length > 0) {
      const insertResult =
        await Sale.insertMany(sales);

      console.log(
        `Inserted ${insertResult.length} sales records.`
      );
    }

    console.log("Synthetic sales generation completed.");
  } catch (error) {
    console.error(
      "Synthetic sales generation failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB disconnected.");
  }
}

generateSalesData();