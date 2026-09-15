const API_BASE_URL = "http://localhost:5000";

export async function getAdminTransactions(
  getToken
) {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/transactions`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch admin transactions"
    );
  }

  return data;
}