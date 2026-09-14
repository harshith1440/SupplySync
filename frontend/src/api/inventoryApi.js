const API_URL = "http://localhost:5000/api/inventory";
const EXPIRY_API_URL = "http://localhost:5000/api/expiry";

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

async function expiryApiRequest(endpoint, options = {}, getToken) {
  const token = await getToken();

  const response = await fetch(`${EXPIRY_API_URL}${endpoint}`, {
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

export async function getInventory(getToken) {
  return apiRequest("/", {}, getToken);
}

export async function getInventoryItem(id, getToken) {
  return apiRequest(`/${id}`, {}, getToken);
}

export async function createInventoryItem(item, getToken) {
  return apiRequest(
    "/",
    {
      method: "POST",
      body: JSON.stringify(item),
    },
    getToken
  );
}

export async function updateInventoryItem(id, item, getToken) {
  return apiRequest(
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(item),
    },
    getToken
  );
}

export async function deleteInventoryItem(id, getToken) {
  return apiRequest(
    `/${id}`,
    {
      method: "DELETE",
    },
    getToken
  );
}

export async function getLowStockInventory(getToken) {
  return apiRequest("/low-stock", {}, getToken);
}

export async function getExpiredInventory(getToken) {
  return expiryApiRequest("/expired", {}, getToken);
}

export async function getExpiringSoonInventory(getToken) {
  return expiryApiRequest("/expiring-soon", {}, getToken);
}