const API_URL = "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}, getToken) {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

export function getBills(getToken) {
  return apiRequest("/bills", {}, getToken);
}

export function generateBill(getToken) {
  return apiRequest("/bills/generate", { method: "POST" }, getToken);
}

export function createBillPaymentOrder(billId, getToken) {
  return apiRequest("/payments/bill-order", { method: "POST", body: JSON.stringify({ billId }) }, getToken);
}

export function verifyBillPayment(paymentData, getToken) {
  return apiRequest("/payments/bill-verify", { method: "POST", body: JSON.stringify(paymentData) }, getToken);
}