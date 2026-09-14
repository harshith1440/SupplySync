const mongoose = require("mongoose");
require("dotenv").config();

const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");

const suppliers = [
  {
    supplierName: "Sri Lakshmi Wholesale",
    contactPerson: "Ramesh Kumar",
    email: "ramesh@srilakshmiwholesale.com",
    phone: "9876543210",

    products: [
      {
        sku: "ATTA-5KG",
        productName: "Aashirvaad Atta",
        category: "groceries",
        unitPrice: 210,
        minimumOrderQuantity: 20,
        availableQuantity: 500,
      },
      {
        sku: "SP125",
        productName: "Sprite",
        category: "beverages",
        unitPrice: 35,
        minimumOrderQuantity: 24,
        availableQuantity: 800,
      },
    ],

    leadTimeDays: 2,
    reliabilityScore: 95,
    rating: 4.7,
    active: true,
  },

  {
    supplierName: "Metro Retail Suppliers",
    contactPerson: "Suresh Reddy",
    email: "suresh@metroretailsuppliers.com",
    phone: "9876543211",

    products: [
      {
        sku: "ATTA-5KG",
        productName: "Aashirvaad Atta",
        category: "groceries",
        unitPrice: 205,
        minimumOrderQuantity: 30,
        availableQuantity: 400,
      },
      {
        sku: "MK 001",
        productName: "Milk",
        category: "dairy",
        unitPrice: 46,
        minimumOrderQuantity: 50,
        availableQuantity: 300,
      },
    ],

    leadTimeDays: 5,
    reliabilityScore: 88,
    rating: 4.4,
    active: true,
  },

  {
    supplierName: "Deccan Food Distributors",
    contactPerson: "Anil Sharma",
    email: "anil@deccanfooddistributors.com",
    phone: "9876543212",

    products: [
      {
        sku: "ATTA-5KG",
        productName: "Aashirvaad Atta",
        category: "groceries",
        unitPrice: 215,
        minimumOrderQuantity: 10,
        availableQuantity: 600,
      },
    ],

    leadTimeDays: 1,
    reliabilityScore: 98,
    rating: 4.9,
    active: true,
  },

  {
    supplierName: "Fresh Dairy Suppliers",
    contactPerson: "Prakash Rao",
    email: "prakash@freshdairy.com",
    phone: "9876543213",

    products: [
      {
        sku: "MK 001",
        productName: "Milk",
        category: "dairy",
        unitPrice: 48,
        minimumOrderQuantity: 20,
        availableQuantity: 500,
      },
    ],

    leadTimeDays: 1,
    reliabilityScore: 97,
    rating: 4.8,
    active: true,
  },

  {
    supplierName: "Daily Fresh Distributors",
    contactPerson: "Vijay Kumar",
    email: "vijay@dailyfresh.com",
    phone: "9876543214",

    products: [
      {
        sku: "MK 001",
        productName: "Milk",
        category: "dairy",
        unitPrice: 46,
        minimumOrderQuantity: 50,
        availableQuantity: 700,
      },
    ],

    leadTimeDays: 2,
    reliabilityScore: 91,
    rating: 4.5,
    active: true,
  },

  {
    supplierName: "Telangana Dairy Hub",
    contactPerson: "Mahesh Reddy",
    email: "mahesh@telanganadairy.com",
    phone: "9876543215",

    products: [
      {
        sku: "MK 001",
        productName: "Milk",
        category: "dairy",
        unitPrice: 50,
        minimumOrderQuantity: 10,
        availableQuantity: 1000,
      },
    ],

    leadTimeDays: 1,
    reliabilityScore: 99,
    rating: 4.9,
    active: true,
  },

  {
    supplierName: "South India Beverages",
    contactPerson: "Kiran Rao",
    email: "kiran@southindiabeverages.com",
    phone: "9876543216",

    products: [
      {
        sku: "SP125",
        productName: "Sprite",
        category: "beverages",
        unitPrice: 35,
        minimumOrderQuantity: 24,
        availableQuantity: 1000,
      },
    ],

    leadTimeDays: 3,
    reliabilityScore: 92,
    rating: 4.6,
    active: true,
  },

  {
    supplierName: "Hyderabad Beverage Distributors",
    contactPerson: "Naveen Kumar",
    email: "naveen@hydbeverages.com",
    phone: "9876543217",

    products: [
      {
        sku: "SP125",
        productName: "Sprite",
        category: "beverages",
        unitPrice: 33,
        minimumOrderQuantity: 48,
        availableQuantity: 1200,
      },
    ],

    leadTimeDays: 4,
    reliabilityScore: 86,
    rating: 4.3,
    active: true,
  },

  {
    supplierName: "QuickServe Distributors",
    contactPerson: "Rahul Verma",
    email: "rahul@quickserve.com",
    phone: "9876543218",

    products: [
      {
        sku: "SP125",
        productName: "Sprite",
        category: "beverages",
        unitPrice: 36,
        minimumOrderQuantity: 12,
        availableQuantity: 900,
      },
    ],

    leadTimeDays: 1,
    reliabilityScore: 98,
    rating: 4.8,
    active: true,
  },
];

async function generateSupplierData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      "MongoDB connected successfully."
    );

    const inventory = await Inventory.find({}).lean();

    if (inventory.length === 0) {
      console.log(
        "No inventory products found."
      );
      return;
    }

    const organizationIds = [
      ...new Set(
        inventory.map(
          (item) => item.organizationId
        )
      ),
    ];

    console.log(
      `Found ${inventory.length} inventory products.`
    );

    console.log(
      `Found ${organizationIds.length} organization(s).`
    );

    for (const organizationId of organizationIds) {
      const existingSuppliers =
        await Supplier.countDocuments({
          organizationId,
        });

      if (existingSuppliers > 0) {
        await Supplier.deleteMany({
          organizationId,
        });

        console.log(
          `Removed ${existingSuppliers} existing suppliers for organization ${organizationId}.`
        );
      }

      const suppliersForOrganization =
        suppliers.map((supplier) => ({
          ...supplier,
          organizationId,
        }));

      await Supplier.insertMany(
        suppliersForOrganization
      );

      console.log(
        `Inserted ${suppliersForOrganization.length} suppliers for organization ${organizationId}.`
      );
    }

    const totalSuppliers =
      await Supplier.countDocuments();

    console.log("");
    console.log(
      `Total suppliers in database: ${totalSuppliers}`
    );

    console.log("");
    console.log(
      "Supplier catalogs:"
    );

    const allSuppliers =
      await Supplier.find({}).lean();

    for (const supplier of allSuppliers) {
      console.log(
        `${supplier.supplierName} → ${supplier.products
          .map(
            (product) =>
              `${product.productName} (${product.sku})`
          )
          .join(", ")}`
      );
    }

    console.log("");
    console.log(
      "Supplier data generation completed."
    );
  } catch (error) {
    console.error(
      "Supplier data generation failed:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

generateSupplierData();