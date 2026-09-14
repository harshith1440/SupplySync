const mongoose = require("mongoose");
require("dotenv").config();

const Sale = require("../models/Sale");
const ForecastFeature = require("../models/ForecastFeature");

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
}

function round(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function calculateAverage(values) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function calculateStdDev(values) {
  if (values.length === 0) {
    return 0;
  }

  const average = calculateAverage(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum + Math.pow(value - average, 2),
      0
    ) / values.length;

  return Math.sqrt(variance);
}

function getISOWeek(date) {
  const currentDate = new Date(date);

  currentDate.setHours(12, 0, 0, 0);

  currentDate.setDate(
    currentDate.getDate() +
      4 -
      (currentDate.getDay() || 7)
  );

  const yearStart = new Date(
    currentDate.getFullYear(),
    0,
    1
  );

  return Math.ceil(
    ((currentDate - yearStart) / 86400000 + 1) / 7
  );
}

function getValueFromHistory(history, index) {
  if (index < 0 || index >= history.length) {
    return 0;
  }

  return history[index];
}

function getPreviousValues(
  history,
  currentIndex,
  numberOfDays
) {
  const startIndex = Math.max(
    0,
    currentIndex - numberOfDays
  );

  return history.slice(
    startIndex,
    currentIndex
  );
}

async function generateForecastFeatures() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from .env"
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("MongoDB connected.");

    console.log(
      "\n========== FORECAST FEATURE ENGINEERING ==========\n"
    );

    const sales = await Sale.find({})
      .sort({
        organizationId: 1,
        sku: 1,
        saleDate: 1,
      })
      .lean();

    if (sales.length === 0) {
      console.log(
        "❌ No sales records found. Generate sales data first."
      );

      return;
    }

    console.log(
      `Found ${sales.length} historical sales records.`
    );

    const groupedSales = new Map();

    for (const sale of sales) {
      const key = `${sale.organizationId}::${sale.sku}`;

      if (!groupedSales.has(key)) {
        groupedSales.set(key, []);
      }

      groupedSales.get(key).push(sale);
    }

    const features = [];

    for (const [key, productSales] of groupedSales.entries()) {
      console.log(
        `Generating features for ${productSales[0].productName} (${productSales[0].sku})`
      );

      const history = productSales.map(
        (sale) => sale.quantitySold
      );

      /*
       * The first 30 records are excluded because
       * lag30 and rolling30 require 30 previous days.
       */
      for (
        let currentIndex = 30;
        currentIndex < productSales.length;
        currentIndex++
      ) {
        const sale = productSales[currentIndex];

        const saleDate = startOfDay(
          sale.saleDate
        );

        const previous7Days =
          getPreviousValues(
            history,
            currentIndex,
            7
          );

        const previous14Days =
          getPreviousValues(
            history,
            currentIndex,
            14
          );

        const previous30Days =
          getPreviousValues(
            history,
            currentIndex,
            30
          );

        const dayOfWeek =
          saleDate.getDay();

        features.push({
          organizationId:
            sale.organizationId,

          inventoryId:
            sale.inventoryId,

          productName:
            sale.productName,

          sku:
            sale.sku,

          category:
            sale.category,

          saleDate,

          // Target
          quantitySold:
            sale.quantitySold,

          // Business features
          sellingPrice:
            sale.sellingPrice,

          discount:
            sale.discount,

          promotion:
            sale.promotion,

          festival:
            sale.festival,

          // Calendar features
          dayOfWeek,

          dayOfMonth:
            saleDate.getDate(),

          month:
            saleDate.getMonth() + 1,

          weekOfYear:
            getISOWeek(saleDate),

          isWeekend:
            dayOfWeek === 0 ||
            dayOfWeek === 6,

          // Lag features
          lag1:
            getValueFromHistory(
              history,
              currentIndex - 1
            ),

          lag7:
            getValueFromHistory(
              history,
              currentIndex - 7
            ),

          lag14:
            getValueFromHistory(
              history,
              currentIndex - 14
            ),

          lag30:
            getValueFromHistory(
              history,
              currentIndex - 30
            ),

          // Rolling features
          rolling7Average:
            round(
              calculateAverage(
                previous7Days
              )
            ),

          rolling14Average:
            round(
              calculateAverage(
                previous14Days
              )
            ),

          rolling30Average:
            round(
              calculateAverage(
                previous30Days
              )
            ),

          rolling7StdDev:
            round(
              calculateStdDev(
                previous7Days
              )
            ),
        });
      }
    }

    console.log(
      `\nGenerated ${features.length} forecast feature records.`
    );

    const organizationIds = [
      ...new Set(
        sales.map(
          (sale) =>
            sale.organizationId
        )
      ),
    ];

    const deleteResult =
      await ForecastFeature.deleteMany({
        organizationId: {
          $in: organizationIds,
        },
      });

    console.log(
      `Removed ${deleteResult.deletedCount} existing feature records.`
    );

    if (features.length > 0) {
      const insertResult =
        await ForecastFeature.insertMany(
          features
        );

      console.log(
        `Inserted ${insertResult.length} forecast feature records.`
      );
    }

    console.log(
      "\n========== FEATURE ENGINEERING SUMMARY =========="
    );

    console.log(
      `Historical sales records: ${sales.length}`
    );

    console.log(
      `Training feature records: ${features.length}`
    );

    console.log(
      "Features: lag1, lag7, lag14, lag30"
    );

    console.log(
      "Rolling features: 7-day, 14-day, 30-day averages"
    );

    console.log(
      "Volatility feature: 7-day standard deviation"
    );

    console.log(
      "Calendar features: day, month, week, weekend"
    );

    console.log(
      "Business features: price, discount, promotion, festival"
    );

    console.log(
      "Data leakage protection: rolling windows exclude current day"
    );

    console.log(
      "===============================================\n"
    );

    console.log(
      "✅ Forecast feature generation completed."
    );
  } catch (error) {
    console.error(
      "Forecast feature generation failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

generateForecastFeatures();