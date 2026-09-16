const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function adminRequest(endpoint, options = {}, getToken) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// 1. Users
export async function getAdminUsers(getToken) {
  return adminRequest("/api/users/admin/users", { method: "GET" }, getToken);
}

// 2. Suppliers
export async function getAdminSuppliers(getToken) {
  return adminRequest("/api/suppliers/admin/approvals", { method: "GET" }, getToken);
}

export async function updateSupplierApproval(supplierId, status, reason = "", getToken) {
  return adminRequest(
    `/api/suppliers/admin/${encodeURIComponent(supplierId)}/approval`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    },
    getToken
  );
}

// 3. Retailers
export async function getAdminRetailers(getToken) {
  return adminRequest("/api/users/admin/retailers", { method: "GET" }, getToken);
}

export async function updateRetailerApproval(retailerId, status, reason = "", getToken) {
  return adminRequest(
    `/api/users/admin/retailers/${encodeURIComponent(retailerId)}/approval`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    },
    getToken
  );
}

export async function assignRetailerAdmin(userId, getToken) {
  return adminRequest(
    "/api/users/admin/retailer-admin",
    {
      method: "PATCH",
      body: JSON.stringify({ userId }),
    },
    getToken
  );
}

// 4. Transactions
export async function getAdminTransactions(getToken) {
  return adminRequest("/api/admin/transactions", { method: "GET" }, getToken);
}

// 5. System Health & Diagnostics
export async function getAdminSystemHealth(getToken) {
  return adminRequest("/api/admin/transactions/health", { method: "GET" }, getToken);
}
