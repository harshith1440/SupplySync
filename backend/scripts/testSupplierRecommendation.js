const {
  recommendSuppliers,
} = require("../services/supplierRecommendation");

const suppliers = [
  {
    supplierName: "Sri Lakshmi Wholesale",
    unitPrice: 210,
    leadTimeDays: 2,
    minimumOrderQuantity: 20,
    reliabilityScore: 95,
    rating: 4.7,
  },

  {
    supplierName: "Metro Retail Suppliers",
    unitPrice: 205,
    leadTimeDays: 5,
    minimumOrderQuantity: 30,
    reliabilityScore: 88,
    rating: 4.4,
  },

  {
    supplierName: "Deccan Food Distributors",
    unitPrice: 215,
    leadTimeDays: 1,
    minimumOrderQuantity: 10,
    reliabilityScore: 98,
    rating: 4.9,
  },
];

const requiredQuantity = 31;

const recommendation =
  recommendSuppliers(
    suppliers,
    requiredQuantity
  );

console.log(
  JSON.stringify(
    recommendation,
    null,
    2
  )
);