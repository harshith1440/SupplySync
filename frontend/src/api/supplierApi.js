const API_URL =
  "http://localhost:5000/api/suppliers";

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
GET ALL SUPPLIERS
========================================================
*/

export async function getSuppliers(
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
GET SUPPLIERS FOR SKU
========================================================
*/

export async function getSuppliersForSku(
  sku,
  getToken
) {
  return apiRequest(
    `/${encodeURIComponent(sku)}`,
    {},
    getToken
  );
}

export async function getSupplierProfile(getToken) {
  return apiRequest("/me", {}, getToken);
}

export async function getSupplierApprovals(getToken) {
  return apiRequest("/admin/approvals", {}, getToken);
}

export async function updateSupplierApproval(supplierId, status, reason, getToken) {
  return apiRequest(`/admin/${encodeURIComponent(supplierId)}/approval`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  }, getToken);
}

export async function updateSupplierProfile(profile, getToken) {
  return apiRequest(
    "/me/profile",
    {
      method: "PUT",
      body: JSON.stringify(profile),
    },
    getToken
  );
}

export async function createSupplierProduct(product, getToken) {
  return apiRequest(
    "/me/products",
    {
      method: "POST",
      body: JSON.stringify(product),
    },
    getToken
  );
}

export async function updateSupplierProduct(sku, product, getToken) {
  return apiRequest(
    `/me/products/${encodeURIComponent(sku)}`,
    {
      method: "PATCH",
      body: JSON.stringify(product),
    },
    getToken
  );
}

export async function deactivateSupplierProduct(sku, getToken) {
  return apiRequest(
    `/me/products/${encodeURIComponent(sku)}`,
    { method: "DELETE" },
    getToken
  );
}