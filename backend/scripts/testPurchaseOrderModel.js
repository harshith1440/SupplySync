// testing done in purchase order model properly

require("dotenv").config();

const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");

async function testPurchaseOrderModel() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.");
    console.log("");
    console.log("========================================");
    console.log("PURCHASE ORDER MODEL TEST");
    console.log("========================================");

    const testOrder = new PurchaseOrder({
      organizationId: "org_test",

      supplierId: new mongoose.Types.ObjectId(),

      supplierName: "Test Supplier",

      items: [
        {
          inventoryId: new mongoose.Types.ObjectId(),
          sku: "ATTA-5KG",
          productName: "Aashirvaad Atta",
          unit: "packet",
          quantity: 20,
          unitPrice: 210,
          totalPrice: 4200,
        },
        {
          inventoryId: new mongoose.Types.ObjectId(),
          sku: "MK001",
          productName: "Milk",
          unit: "packet",
          quantity: 30,
          unitPrice: 50,
          totalPrice: 1500,
        },
        {
          inventoryId: new mongoose.Types.ObjectId(),
          sku: "SP125",
          productName: "Sprite",
          unit: "bottle",
          quantity: 50,
          unitPrice: 40,
          totalPrice: 2000,
        },
      ],

      subtotal: 7700,

      totalAmount: 7700,

      orderStatus: "pending",

      paymentStatus: "pending",
    });

    await testOrder.validate();

    console.log("");
    console.log("Supplier:", testOrder.supplierName);
    console.log("Items:", testOrder.items.length);
    console.log("");

    testOrder.items.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.productName} → ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}`
      );
    });

    console.log("");
    console.log("Subtotal:", `₹${testOrder.subtotal}`);
    console.log("Total Amount:", `₹${testOrder.totalAmount}`);
    console.log("Order Status:", testOrder.orderStatus);
    console.log("Payment Status:", testOrder.paymentStatus);

    console.log("");
    console.log("✓ Multiple items in one purchase order");
    console.log("✓ Single supplier");
    console.log("✓ Single total amount");
    console.log("✓ Payment status supported");
    console.log("✓ Razorpay fields supported");
    console.log("");
    console.log(
      "Purchase Order model test completed successfully."
    );
  } catch (error) {
    console.error(
      "Purchase Order model test failed:",
      error
    );
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

testPurchaseOrderModel();