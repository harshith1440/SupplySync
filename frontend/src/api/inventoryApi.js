const API_URL = "http://localhost:5000/api/inventory";

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

// GET all inventory items
export async function getInventory(getToken) {
  return apiRequest("/", {}, getToken);
}

// GET one inventory item
export async function getInventoryItem(id, getToken) {
  return apiRequest(`/${id}`, {}, getToken);
}

// CREATE inventory item
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

// UPDATE inventory item
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

// DELETE inventory item
export async function deleteInventoryItem(id, getToken) {
  return apiRequest(
    `/${id}`,
    {
      method: "DELETE",
    },
    getToken
  );
}

// GET low-stock inventory items
export async function getLowStockInventory(getToken) {
  return apiRequest("/low-stock", {}, getToken);
}