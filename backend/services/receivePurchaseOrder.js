const mongoose = require("mongoose");
const Inventory = require("../models/Inventory");
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");

async function receivePurchaseOrder(purchaseOrderId) {
  const session = await mongoose.startSession();

  try {
    let receiptResult;
    await session.withTransaction(async () => {
      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        {
          _id: purchaseOrderId,
          inventoryUpdatedAt: null,
        },
        {
          $set: {
            inventoryUpdatedAt: new Date(),
            orderStatus: "confirmed",
          },
        },
        { new: true, session }
      );

      if (!purchaseOrder) {
        const existingOrder = await PurchaseOrder.findById(purchaseOrderId)
          .select("inventoryUpdatedAt paymentStatus")
          .session(session)
          .lean();

        receiptResult = {
          updated: false,
          alreadyUpdated: existingOrder?.inventoryUpdatedAt != null,
        };
        return;
      }

      if (!purchaseOrder.retailerUserId || !purchaseOrder.organizationId) {
        throw new Error("Purchase order is missing retailer ownership fields");
      }

      for (const item of purchaseOrder.items) {
        const supplierStockUpdate = await Supplier.updateOne(
          {
            _id: purchaseOrder.supplierId,
            organizationId: purchaseOrder.supplierOrganizationId,
            active: true,
            products: {
              $elemMatch: {
                sku: item.sku,
                active: { $ne: false },
                availableQuantity: { $gte: item.quantity },
              },
            },
          },
          {
            $inc: {
              "products.$[product].availableQuantity": -item.quantity,
            },
          },
          {
            arrayFilters: [
              {
                "product.sku": item.sku,
                "product.active": { $ne: false },
                "product.availableQuantity": { $gte: item.quantity },
              },
            ],
            session,
          }
        );

        if (supplierStockUpdate.modifiedCount !== 1) {
          throw new Error(
            `Supplier stock is insufficient for SKU ${item.sku}`
          );
        }

        const inventoryFilter = {
          organizationId: purchaseOrder.organizationId,
          retailerUserId: purchaseOrder.retailerUserId,
          sku: item.sku,
        };

        const existingInventory = await Inventory.findOne({
          $or: [
            inventoryFilter,
            {
              organizationId: purchaseOrder.organizationId,
              retailerUserId: null,
              sku: item.sku,
            },
          ],
        }).session(session);

        if (existingInventory) {
          existingInventory.retailerUserId = purchaseOrder.retailerUserId;
          existingInventory.quantity += item.quantity;
          existingInventory.supplierId = purchaseOrder.supplierId;
          existingInventory.supplierName = purchaseOrder.supplierName;
          existingInventory.purchasePrice = item.unitPrice;
          existingInventory.price =
            existingInventory.price ?? item.unitPrice;
          existingInventory.manufacturingDate = item.manufacturingDate;
          existingInventory.expiryDate = item.expiryDate;
          existingInventory.sourcePurchaseOrderId = purchaseOrder._id;
          existingInventory.sourceSupplierProduct = item.toObject
            ? item.toObject()
            : item;
          await existingInventory.save({ session });
        } else {
          await Inventory.create(
            [
              {
                organizationId: purchaseOrder.organizationId,
                retailerUserId: purchaseOrder.retailerUserId,
                productName: item.productName,
                sku: item.sku,
                brand: item.brand || null,
                category: item.category || "Purchased",
                unit: item.unit || "piece",
                supplierId: purchaseOrder.supplierId,
                supplierName: purchaseOrder.supplierName,
                sourcePurchaseOrderId: purchaseOrder._id,
                sourceSupplierProduct: item.toObject ? item.toObject() : item,
                purchasePrice: item.unitPrice,
                price: item.unitPrice,
                manufacturingDate: item.manufacturingDate,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                reorderLevel: 10,
              },
            ],
            { session }
          );
        }
      }

      receiptResult = { updated: true, alreadyUpdated: false };
    });

    return receiptResult || { updated: false, alreadyUpdated: false };
  } finally {
    await session.endSession();
  }
}

module.exports = { receivePurchaseOrder };
