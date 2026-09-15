const API_URL = "http://localhost:5000/api/sales";

export async function recordSale({ sku, quantity, idempotencyKey }, getToken) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ sku, quantity }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to record sale");
  }

  return data;
}
