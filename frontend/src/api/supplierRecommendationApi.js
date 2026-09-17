import { API_BASE_URL } from "./config";

const API_URL = `${API_BASE_URL}/api/suppliers`;

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

export async function getForecastBasedSupplierRecommendation(
  sku,
  getToken
) {
  return apiRequest(
    `/forecast-recommendation/${encodeURIComponent(
      sku
    )}`,
    {},
    getToken
  );
}