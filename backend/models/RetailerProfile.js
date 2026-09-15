const mongoose = require("mongoose");

const retailerAddressSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true, default: null },
    contactPerson: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    addressLine1: { type: String, trim: true, default: null },
    addressLine2: { type: String, trim: true, default: null },
    line1: { type: String, trim: true, default: null },
    line2: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    pincode: { type: String, trim: true, default: null },
    postalCode: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const retailerProfileSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, index: true },
    clerkUserId: { type: String, required: true, index: true },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    address: { type: retailerAddressSchema, default: () => ({}) },
    businessName: { type: String, trim: true, default: null },
    contactPerson: { type: String, trim: true, default: null },
    addressLine1: { type: String, trim: true, default: null },
    addressLine2: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

retailerProfileSchema.index(
  { organizationId: 1, clerkUserId: 1 },
  { unique: true }
);

module.exports = mongoose.model("RetailerProfile", retailerProfileSchema);