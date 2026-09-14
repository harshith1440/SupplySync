const API_URL = "http://localhost:5000/api/payments";

async function apiRequest(endpoint, options = {}, getToken) {
  const token = await getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export async function createPaymentOrder(
  purchaseOrderId,
  getToken
) {
  return apiRequest(
    "/order",
    {
      method: "POST",
      body: JSON.stringify({ purchaseOrderId }),
    },
    getToken
  );
}

export async function verifyPayment(paymentData, getToken) {
  return apiRequest(
    "/verify",
    {
      method: "POST",
      body: JSON.stringify(paymentData),
    },
    getToken
  );
}
