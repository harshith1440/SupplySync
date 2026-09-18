//validating sales data
const mongoose = require("mongoose");
require("dotenv").config();

const Sale = require("../models/Sale");

async function validateSalesData() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");
    console.log("\n========== SALES DATA VALIDATION ==========\n");

    const totalRecords = await Sale.countDocuments();

    console.log(`Total records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log("❌ No sales records found.");
      return;
    }

    // --------------------------------------------------
    // 1. DATE RANGE
    // --------------------------------------------------

    const dateRange = await Sale.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: "$saleDate" },
          maxDate: { $max: "$saleDate" },
        },
      },
    ]);

    const minDate = dateRange[0].minDate;
    const maxDate = dateRange[0].maxDate;

    console.log("\n--- Date Range ---");

    console.log(
      `Start date: ${minDate.toISOString().split("T")[0]}`
    );

    console.log(
      `End date: ${maxDate.toISOString().split("T")[0]}`
    );

    // --------------------------------------------------
    // 2. PRODUCTS / SKUS
    // --------------------------------------------------

    const skuSummary = await Sale.aggregate([
      {
        $group: {
          _id: "$sku",
          productName: { $first: "$productName" },
          records: { $sum: 1 },
          totalQuantitySold: {
            $sum: "$quantitySold",
          },
          averageDailySales: {
            $avg: "$quantitySold",
          },
          minimumDailySales: {
            $min: "$quantitySold",
          },
          maximumDailySales: {
            $max: "$quantitySold",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log("\n--- Product Summary ---");

    for (const product of skuSummary) {
      console.log(`
${product.productName}
SKU: ${product._id}
Records: ${product.records}
Total units sold: ${product.totalQuantitySold}
Average daily sales: ${product.averageDailySales.toFixed(2)}
Minimum daily sales: ${product.minimumDailySales}
Maximum daily sales: ${product.maximumDailySales}
`);
    }

    // --------------------------------------------------
    // 3. ZERO SALES DAYS
    // --------------------------------------------------

    const zeroSalesSummary = await Sale.aggregate([
      {
        $match: {
          quantitySold: 0,
        },
      },
      {
        $group: {
          _id: "$sku",
          productName: { $first: "$productName" },
          zeroSalesDays: { $sum: 1 },
        },
      },
      {
        $sort: {
          zeroSalesDays: -1,
        },
      },
    ]);

    console.log("\n--- Zero Sales Days ---");

    if (zeroSalesSummary.length === 0) {
      console.log("No zero-sales days found.");
    } else {
      for (const product of zeroSalesSummary) {
        console.log(
          `${product.productName} (${product._id}): ${product.zeroSalesDays} zero-sales days`
        );
      }
    }

    // --------------------------------------------------
    // 4. PROMOTIONS
    // --------------------------------------------------

    const promotionSummary = await Sale.aggregate([
      {
        $group: {
          _id: "$sku",
          productName: { $first: "$productName" },
          totalRecords: { $sum: 1 },
          promotionDays: {
            $sum: {
              $cond: [
                "$promotion",
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    console.log("\n--- Promotions ---");

    for (const product of promotionSummary) {
      const percentage =
        (product.promotionDays /
          product.totalRecords) *
        100;

      console.log(
        `${product.productName} (${product._id}): ${product.promotionDays} promotion days (${percentage.toFixed(
          2
        )}%)`
      );
    }

    // --------------------------------------------------
    // 5. DISCOUNTS
    // --------------------------------------------------

    const discountSummary = await Sale.aggregate([
      {
        $group: {
          _id: null,
          minimumDiscount: {
            $min: "$discount",
          },
          maximumDiscount: {
            $max: "$discount",
          },
          averageDiscount: {
            $avg: "$discount",
          },
        },
      },
    ]);

    console.log("\n--- Discounts ---");

    const discounts = discountSummary[0];

    console.log(
      `Minimum discount: ${discounts.minimumDiscount}%`
    );

    console.log(
      `Maximum discount: ${discounts.maximumDiscount}%`
    );

    console.log(
      `Average discount: ${discounts.averageDiscount.toFixed(
        2
      )}%`
    );

    // --------------------------------------------------
    // 6. FESTIVALS
    // --------------------------------------------------

    const festivalSummary = await Sale.aggregate([
      {
        $match: {
          festival: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$festival",
          records: { $sum: 1 },
          totalQuantitySold: {
            $sum: "$quantitySold",
          },
          averageQuantitySold: {
            $avg: "$quantitySold",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log("\n--- Festival Sales ---");

    if (festivalSummary.length === 0) {
      console.log("No festival records found.");
    } else {
      for (const festival of festivalSummary) {
        console.log(
          `${festival._id}: ${festival.records} records, average sales ${festival.averageQuantitySold.toFixed(
            2
          )}`
        );
      }
    }

    // --------------------------------------------------
    // 7. WEEKDAY VS WEEKEND
    // --------------------------------------------------

    const weekdayWeekendSummary = await Sale.aggregate([
      {
        $project: {
          quantitySold: 1,
          dayOfWeek: {
            $dayOfWeek: "$saleDate",
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              {
                $in: ["$dayOfWeek", [1, 7]],
              },
              "Weekend",
              "Weekday",
            ],
          },
          records: { $sum: 1 },
          totalQuantitySold: {
            $sum: "$quantitySold",
          },
          averageQuantitySold: {
            $avg: "$quantitySold",
          },
        },
      },
    ]);

    console.log("\n--- Weekday vs Weekend ---");

    for (const group of weekdayWeekendSummary) {
      console.log(
        `${group._id}: ${group.records} records, average sales ${group.averageQuantitySold.toFixed(
          2
        )}`
      );
    }

    // --------------------------------------------------
    // 8. NEGATIVE SALES CHECK
    // --------------------------------------------------

    const negativeSales = await Sale.countDocuments({
      quantitySold: {
        $lt: 0,
      },
    });

    console.log("\n--- Data Integrity ---");

    if (negativeSales === 0) {
      console.log("✅ No negative sales quantities.");
    } else {
      console.log(
        `❌ Found ${negativeSales} negative sales records.`
      );
    }

    // --------------------------------------------------
    // 9. INVALID DISCOUNTS
    // --------------------------------------------------

    const invalidDiscounts = await Sale.countDocuments({
      discount: {
        $lt: 0,
      },
    });

    if (invalidDiscounts === 0) {
      console.log("✅ No negative discounts.");
    } else {
      console.log(
        `❌ Found ${invalidDiscounts} invalid discount records.`
      );
    }

    // --------------------------------------------------
    // 10. PROMOTION / DISCOUNT CONSISTENCY
    // --------------------------------------------------

    const promotionWithoutDiscount =
      await Sale.countDocuments({
        promotion: true,
        discount: 0,
      });

    const discountWithoutPromotion =
      await Sale.countDocuments({
        promotion: false,
        discount: {
          $gt: 0,
        },
      });

    console.log("\n--- Promotion Consistency ---");

    if (promotionWithoutDiscount === 0) {
      console.log(
        "✅ Every promotion has a discount."
      );
    } else {
      console.log(
        `⚠️ ${promotionWithoutDiscount} promotion records have no discount.`
      );
    }

    if (discountWithoutPromotion === 0) {
      console.log(
        "✅ No non-promotion records have discounts."
      );
    } else {
      console.log(
        `⚠️ ${discountWithoutPromotion} non-promotion records have discounts.`
      );
    }

    // --------------------------------------------------
    // 11. DUPLICATE DAILY RECORDS
    // --------------------------------------------------

    const duplicateRecords = await Sale.aggregate([
      {
        $group: {
          _id: {
            organizationId: "$organizationId",
            sku: "$sku",
            saleDate: "$saleDate",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $match: {
          count: {
            $gt: 1,
          },
        },
      },
      {
        $count: "duplicateGroups",
      },
    ]);

    const duplicateGroups =
      duplicateRecords.length > 0
        ? duplicateRecords[0].duplicateGroups
        : 0;

    if (duplicateGroups === 0) {
      console.log(
        "✅ No duplicate daily sales records."
      );
    } else {
      console.log(
        `❌ Found ${duplicateGroups} duplicate daily record groups.`
      );
    }

    // --------------------------------------------------
    // 12. NULL / INVALID PRICES
    // --------------------------------------------------

    const invalidPrices = await Sale.countDocuments({
      $or: [
        {
          sellingPrice: {
            $lt: 0,
          },
        },
        {
          sellingPrice: {
            $exists: false,
          },
        },
      ],
    });

    if (invalidPrices === 0) {
      console.log(
        "✅ All sales have valid selling prices."
      );
    } else {
      console.log(
        `❌ Found ${invalidPrices} invalid price records.`
      );
    }

    // --------------------------------------------------
    // 13. FINAL RESULT
    // --------------------------------------------------

    const checks = [
      totalRecords > 0,
      negativeSales === 0,
      invalidDiscounts === 0,
      promotionWithoutDiscount === 0,
      discountWithoutPromotion === 0,
      duplicateGroups === 0,
      invalidPrices === 0,
    ];

    const passedChecks = checks.filter(Boolean).length;

    console.log("\n============================================");
    console.log(
      `VALIDATION RESULT: ${passedChecks}/${checks.length} checks passed`
    );

    if (passedChecks === checks.length) {
      console.log(
        "✅ SALES DATA VALIDATION PASSED"
      );
    } else {
      console.log(
        "⚠️ SALES DATA VALIDATION NEEDS ATTENTION"
      );
    }

    console.log("============================================\n");
  } catch (error) {
    console.error(
      "Sales data validation failed:",
      error
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB disconnected.");
  }
}

validateSalesData();