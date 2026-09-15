const API_URL = "http://localhost:5000/api/supplier-dashboard";

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
    throw new Error(
      data.message || "Something went wrong"
    );
  }

  return data;
}

export async function getSupplierDashboard(getToken) {
  return apiRequest("/", {}, getToken);
}
