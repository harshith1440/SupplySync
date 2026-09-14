const Razorpay = require("razorpay");

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay configuration is missing. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

async function createRazorpayOrder({
  amount,
  currency = "INR",
  receipt,
  notes = {},
}) {
  const razorpay = getRazorpayInstance();

  return razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes,
  });
}

async function fetchRazorpayPayment(paymentId) {
  const razorpay = getRazorpayInstance();

  return razorpay.payments.fetch(paymentId);
}

async function createRazorpayLinkedAccount({
  email,
  phone,
  legalBusinessName,
  customerFacingBusinessName,
  businessType,
  referenceId,
  profile,
}) {
  const razorpay = getRazorpayInstance();

  return razorpay.accounts.create({
    email,
    phone,
    type: "route",
    legal_business_name: legalBusinessName,
    customer_facing_business_name: customerFacingBusinessName,
    business_type: businessType,
    reference_id: referenceId,
    profile,
  });
}

async function fetchRazorpayLinkedAccount(accountId) {
  const razorpay = getRazorpayInstance();

  return razorpay.accounts.fetch(accountId);
}

async function createRazorpayTransferFromPayment({
  paymentId,
  accountId,
  amount,
  currency = "INR",
  notes = {},
}) {
  const razorpay = getRazorpayInstance();

  return razorpay.payments.createTransfer(paymentId, {
    transfers: [
      {
        account: accountId,
        amount,
        currency,
        notes,
      },
    ],
  });
}

module.exports = {
  getRazorpayInstance,
  createRazorpayOrder,
  fetchRazorpayPayment,
  createRazorpayLinkedAccount,
  fetchRazorpayLinkedAccount,
  createRazorpayTransferFromPayment,
};