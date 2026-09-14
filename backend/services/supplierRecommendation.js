function calculatePriceScore(price, prices) {
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (maxPrice === minPrice) {
    return 100;
  }

  return (
    ((maxPrice - price) /
      (maxPrice - minPrice)) *
    100
  );
}

function calculateLeadTimeScore(
  leadTime,
  leadTimes
) {
  const minLeadTime = Math.min(...leadTimes);
  const maxLeadTime = Math.max(...leadTimes);

  if (maxLeadTime === minLeadTime) {
    return 100;
  }

  return (
    ((maxLeadTime - leadTime) /
      (maxLeadTime - minLeadTime)) *
    100
  );
}

function calculateMoqScore(
  minimumOrderQuantity,
  requiredQuantity
) {
  if (
    minimumOrderQuantity <= requiredQuantity
  ) {
    return 100;
  }

  const excessRatio =
    (minimumOrderQuantity - requiredQuantity) /
    requiredQuantity;

  return Math.max(
    0,
    100 - excessRatio * 100
  );
}

function calculateAvailabilityScore(
  availableQuantity,
  requiredQuantity
) {
  if (availableQuantity >= requiredQuantity) {
    return 100;
  }

  if (availableQuantity <= 0) {
    return 0;
  }

  return (
    (availableQuantity / requiredQuantity) *
    100
  );
}

function calculateSupplierScore(
  supplier,
  product,
  products,
  requiredQuantity
) {
  const prices = products.map(
    (item) => item.product.unitPrice
  );

  const leadTimes = products.map(
    (item) => item.supplier.leadTimeDays
  );

  const priceScore = calculatePriceScore(
    product.unitPrice,
    prices
  );

  const leadTimeScore =
    calculateLeadTimeScore(
      supplier.leadTimeDays,
      leadTimes
    );

  const reliabilityScore =
    supplier.reliabilityScore;

  const ratingScore =
    (supplier.rating / 5) * 100;

  const moqScore = calculateMoqScore(
    product.minimumOrderQuantity,
    requiredQuantity
  );

  const availabilityScore =
    calculateAvailabilityScore(
      product.availableQuantity,
      requiredQuantity
    );

  /*
    Weight distribution:

    Price        → 20%
    Lead time    → 15%
    Reliability  → 20%
    Rating       → 15%
    MOQ          → 10%
    Availability → 20%
  */

  const finalScore =
    priceScore * 0.20 +
    leadTimeScore * 0.15 +
    reliabilityScore * 0.20 +
    ratingScore * 0.15 +
    moqScore * 0.10 +
    availabilityScore * 0.20;

  return {
    priceScore: Number(
      priceScore.toFixed(2)
    ),

    leadTimeScore: Number(
      leadTimeScore.toFixed(2)
    ),

    reliabilityScore: Number(
      reliabilityScore.toFixed(2)
    ),

    ratingScore: Number(
      ratingScore.toFixed(2)
    ),

    moqScore: Number(
      moqScore.toFixed(2)
    ),

    availabilityScore: Number(
      availabilityScore.toFixed(2)
    ),

    finalScore: Number(
      finalScore.toFixed(2)
    ),
  };
}

function generateReasons(
  supplier,
  product,
  score,
  requiredQuantity,
  products
) {
  const reasons = [];

  const cheapestPrice = Math.min(
    ...products.map(
      (item) => item.product.unitPrice
    )
  );

  const fastestLeadTime = Math.min(
    ...products.map(
      (item) => item.supplier.leadTimeDays
    )
  );

  const highestReliability = Math.max(
    ...products.map(
      (item) =>
        item.supplier.reliabilityScore
    )
  );

  const highestRating = Math.max(
    ...products.map(
      (item) => item.supplier.rating
    )
  );

  if (
    product.unitPrice === cheapestPrice
  ) {
    reasons.push("Lowest unit price");
  }

  if (
    supplier.leadTimeDays ===
    fastestLeadTime
  ) {
    reasons.push("Fast delivery");
  }

  if (
    supplier.reliabilityScore ===
    highestReliability
  ) {
    reasons.push(
      "Highest reliability"
    );
  }

  if (
    supplier.rating === highestRating
  ) {
    reasons.push(
      "Highest supplier rating"
    );
  }

  if (
    product.minimumOrderQuantity <=
    requiredQuantity
  ) {
    reasons.push(
      "Minimum order quantity is suitable"
    );
  }

  if (
    product.availableQuantity >=
    requiredQuantity
  ) {
    reasons.push(
      "Sufficient stock available"
    );
  } else {
    reasons.push(
      `Only ${product.availableQuantity} units available`
    );
  }

  return reasons;
}

function recommendSuppliers(
  supplierProducts,
  requiredQuantity
) {
  if (
    !Array.isArray(supplierProducts) ||
    supplierProducts.length === 0
  ) {
    throw new Error(
      "No suppliers available"
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

  const scoredSuppliers =
    supplierProducts.map(
      (item) => {
        const score =
          calculateSupplierScore(
            item.supplier,
            item.product,
            supplierProducts,
            requiredQuantity
          );

        const reasons =
          generateReasons(
            item.supplier,
            item.product,
            score,
            requiredQuantity,
            supplierProducts
          );

        return {
          supplier: item.supplier,
          product: item.product,
          ...score,
          reasons,
        };
      }
    );

  scoredSuppliers.sort(
    (a, b) =>
      b.finalScore - a.finalScore
  );

  const recommended =
    scoredSuppliers[0];

  return {
    requiredQuantity,

    recommendedSupplier: {
      ...recommended.supplier,

      recommendedProduct:
        recommended.product,

      score:
        recommended.finalScore,

      reasons:
        recommended.reasons,
    },

    alternatives:
      scoredSuppliers
        .slice(1)
        .map((item) => ({
          ...item.supplier,

          recommendedProduct:
            item.product,

          score:
            item.finalScore,

          reasons:
            item.reasons,
        })),

    supplierComparison:
      scoredSuppliers.map(
        (item) => ({
          supplierName:
            item.supplier.supplierName,

          unitPrice:
            item.product.unitPrice,

          leadTimeDays:
            item.supplier.leadTimeDays,

          minimumOrderQuantity:
            item.product
              .minimumOrderQuantity,

          availableQuantity:
            item.product
              .availableQuantity,

          reliabilityScore:
            item.supplier
              .reliabilityScore,

          rating:
            item.supplier.rating,

          priceScore:
            item.priceScore,

          leadTimeScore:
            item.leadTimeScore,

          moqScore:
            item.moqScore,

          availabilityScore:
            item.availabilityScore,

          finalScore:
            item.finalScore,
        })
      ),
  };
}

module.exports = {
  recommendSuppliers,
};