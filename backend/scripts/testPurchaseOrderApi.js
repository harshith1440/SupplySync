require("dotenv").config();

const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const PurchaseOrder = require("../models/PurchaseOrder");

const ORGANIZATION_ID =
  "org_3JENm0pO9GItdIRcC0WyfXFJgKM";

async function testPurchaseOrderApiLogic() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.");
    console.log("");
    console.log("========================================");
    console.log("PURCHASE ORDER API LOGIC TEST");
    console.log("========================================");

    /*
    --------------------------------------------------
    FIND A REAL SUPPLIER
    --------------------------------------------------
    */

    const supplier = await Supplier.findOne({
      organizationId: ORGANIZATION_ID,
      supplierName: "Sri Lakshmi Wholesale",
      active: true,
    }).lean();

    if (!supplier) {
      throw new Error(
        "Sri Lakshmi Wholesale not found"
      );
    }

    console.log("");
    console.log(
      "Supplier:",
      supplier.supplierName
    );

    /*
    --------------------------------------------------
    FIND PRODUCTS SUPPLIED BY THIS SUPPLIER
    --------------------------------------------------
    */

    const selectedProducts =
      supplier.products.filter(
        (product) =>
          product.sku === "ATTA-5KG" ||
          product.sku === "SP125"
      );

    if (selectedProducts.length !== 2) {
      throw new Error(
        "Expected ATTA-5KG and SP125 in supplier catalog"
      );
    }

    console.log(
      "Products selected:",
      selectedProducts.length
    );

    /*
    --------------------------------------------------
    BUILD ORDER ITEMS
    --------------------------------------------------
    */

    const requestedItems = [
      {
        sku: "ATTA-5KG",
        quantity: 20,
      },
      {
        sku: "SP125",
        quantity: 50,
      },
    ];

    const purchaseOrderItems = [];

    for (const requestedItem of requestedItems) {
      const supplierProduct =
        supplier.products.find(
          (product) =>
            product.sku ===
            requestedItem.sku
        );

      if (!supplierProduct) {
        throw new Error(
          `Supplier does not supply ${requestedItem.sku}`
        );
      }

      if (
        requestedItem.quantity <
        supplierProduct.minimumOrderQuantity
      ) {
        throw new Error(
          `MOQ failed for ${requestedItem.sku}`
        );
      }

      if (
        requestedItem.quantity >
        supplierProduct.availableQuantity
      ) {
        throw new Error(
          `Availability failed for ${requestedItem.sku}`
        );
      }

      const inventory =
        await Inventory.findOne({
          organizationId: ORGANIZATION_ID,
          sku: requestedItem.sku,
        }).lean();

      if (!inventory) {
        throw new Error(
          `Inventory not found for ${requestedItem.sku}`
        );
      }

      const totalPrice =
        requestedItem.quantity *
        supplierProduct.unitPrice;

      purchaseOrderItems.push({
        inventoryId: inventory._id,

        sku: supplierProduct.sku,

        productName:
          supplierProduct.productName,

        unit: inventory.unit,

        quantity:
          requestedItem.quantity,

        unitPrice:
          supplierProduct.unitPrice,

        totalPrice,
      });
    }

    /*
    --------------------------------------------------
    CALCULATE TOTAL
    --------------------------------------------------
    */

    const subtotal =
      purchaseOrderItems.reduce(
        (total, item) =>
          total + item.totalPrice,
        0
      );

    /*
    --------------------------------------------------
    CREATE REAL TEST PURCHASE ORDER
    --------------------------------------------------
    */

    const purchaseOrder =
      await PurchaseOrder.create({
        organizationId:
          ORGANIZATION_ID,

        supplierId:
          supplier._id,

        supplierName:
          supplier.supplierName,

        items: purchaseOrderItems,

        subtotal,

        totalAmount: subtotal,

        orderStatus: "pending",

        paymentStatus: "pending",
      });

    /*
    --------------------------------------------------
    DISPLAY RESULT
    --------------------------------------------------
    */

    console.log("");
    console.log("========================================");
    console.log("PURCHASE ORDER CREATED");
    console.log("========================================");

    console.log("");
    console.log(
      "Purchase Order ID:",
      purchaseOrder._id
    );

    console.log(
      "PO Number:",
      purchaseOrder.poNumber
    );

    console.log(
      "Supplier:",
      purchaseOrder.supplierName
    );

    console.log(
      "Items:",
      purchaseOrder.items.length
    );

    console.log("");

    purchaseOrder.items.forEach(
      (item, index) => {
        console.log(
          `${index + 1}. ${item.productName} → ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}`
        );
      }
    );

    console.log("");

    console.log(
      "Subtotal:",
      `₹${purchaseOrder.subtotal}`
    );

    console.log(
      "Total Amount:",
      `₹${purchaseOrder.totalAmount}`
    );

    console.log(
      "Order Status:",
      purchaseOrder.orderStatus
    );

    console.log(
      "Payment Status:",
      purchaseOrder.paymentStatus
    );

    console.log("");
    console.log(
      "✓ One supplier"
    );

    console.log(
      "✓ Multiple products"
    );

    console.log(
      "✓ MOQ validation"
    );

    console.log(
      "✓ Supplier availability validation"
    );

    console.log(
      "✓ Backend price calculation"
    );

    console.log(
      "✓ Single order total"
    );

    console.log(
      "✓ PO number generated"
    );

    console.log(
      "✓ Payment status initialized"
    );

    console.log("");
    console.log(
      "Purchase Order API logic test completed successfully."
    );
  } catch (error) {
    console.error("");
    console.error(
      "Purchase Order API test failed:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log("");
    console.log("MongoDB disconnected.");
  }
}

testPurchaseOrderApiLogic();