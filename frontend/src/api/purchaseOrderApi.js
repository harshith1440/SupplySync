import { API_BASE_URL } from "./config";

const API_URL = `${API_BASE_URL}/api/purchase-orders`;

async function apiRequest(
  endpoint,
  options = {},
  getToken
) {
  const token = await getToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

        ...(options.headers || {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Something went wrong"
    );
  }

  return data;
}

/*
========================================================
CREATE PURCHASE ORDER
========================================================
*/

export async function createPurchaseOrder(
  supplierId,
  items,
  getToken
) {
  return apiRequest(
    "/",
    {
      method: "POST",

      body: JSON.stringify({
        supplierId,
        items,
      }),
    },
    getToken
  );
}

/*
========================================================
GET ALL PURCHASE ORDERS
========================================================
*/

export async function getPurchaseOrders(
  getToken
) {
  return apiRequest(
    "/",
    {},
    getToken
  );
}

/*
========================================================
GET SINGLE PURCHASE ORDER
========================================================
*/

export async function getPurchaseOrder(
  purchaseOrderId,
  getToken
) {
  return apiRequest(
    `/${encodeURIComponent(
      purchaseOrderId
    )}`,
    {},
    getToken
  );
}

export async function markPurchaseOrderDelivered(
  purchaseOrderId,
  getToken
) {
  return apiRequest(
    `/${encodeURIComponent(purchaseOrderId)}/delivered`,
    { method: "PATCH" },
    getToken
  );
}

export async function submitSupplierFeedback(
  purchaseOrderId,
  rating,
  comment,
  getToken
) {
  return apiRequest(
    `/${encodeURIComponent(purchaseOrderId)}/feedback`,
    {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    },
    getToken
  );
}

export async function receivePurchaseOrder(
  purchaseOrderId,
  getToken
) {
  return apiRequest(
    `/${encodeURIComponent(purchaseOrderId)}/receive`,
    { method: "POST" },
    getToken
  );
}