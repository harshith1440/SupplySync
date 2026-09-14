const mongoose = require("mongoose");
require("dotenv").config();

async function fixSupplierIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.");

    const db = mongoose.connection.db;

    const collection = db.collection("suppliers");

    const indexes = await collection.indexes();

    console.log("\nExisting supplier indexes:");

    for (const index of indexes) {
      console.log(index);
    }

    const clerkUserIdIndex = indexes.find(
      (index) => index.name === "clerkUserId_1"
    );

    if (!clerkUserIdIndex) {
      console.log(
        "\nclerkUserId_1 index does not exist."
      );
    } else {
      await collection.dropIndex("clerkUserId_1");

      console.log(
        "\nRemoved old clerkUserId_1 index successfully."
      );
    }

    console.log("\nSupplier index fix completed.");
  } catch (error) {
    console.error(
      "\nFailed to fix supplier index:",
      error.message
    );
  } finally {
    await mongoose.disconnect();

    console.log("MongoDB disconnected.");
  }
}

fixSupplierIndex();