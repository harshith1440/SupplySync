import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

import LogoutButton from "../components/LogoutButton";
import {
  getAdminTransactions,
} from "../api/adminTransactionApi";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value) {
  if (!value) {
    return "-";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function AdminDashboard() {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminTransactions(
          getToken
        );

      setSummary(data.summary || null);
      setTransactions(
        data.transactions || []
      );
    } catch (requestError) {
      console.error(
        "Admin transaction error:",
        requestError
      );

      setError(
        requestError.message ||
          "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [getToken]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px",
        fontFamily:
          "Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              Admin Dashboard
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#6b7280",
              }}
            >
              Transaction &
              Payment Monitoring
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={loadTransactions}
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <LogoutButton />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom:
                "20px",
              padding: "14px",
              borderRadius:
                "10px",
              background:
                "#fee2e2",
              color:
                "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {/* SUMMARY */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom:
                "28px",
            }}
          >
            <SummaryCard
              title="Transactions"
              value={
                summary.totalTransactions
              }
            />

            <SummaryCard
              title="Paid Payments"
              value={
                summary.paidPayments
              }
            />

            <SummaryCard
              title="Pending Payments"
              value={
                summary.pendingPayments
              }
            />

            <SummaryCard
              title="Total Payment Value"
              value={formatCurrency(
                summary.totalPaymentValue
              )}
            />

            <SummaryCard
              title="Successful Payment Value"
              value={formatCurrency(
                summary.successfulPaymentValue
              )}
            />

            <SummaryCard
              title="Pending Payout"
              value={formatCurrency(
                summary.pendingPayoutValue
              )}
            />

            <SummaryCard
              title="Completed Payout"
              value={formatCurrency(
                summary.completedPayoutValue
              )}
            />
          </div>
        )}

        {/* TRANSACTIONS */}
        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom:
                "18px",
            }}
          >
            <h2
              style={{
                margin: 0,
              }}
            >
              All Transactions
            </h2>

            <span
              style={{
                color:
                  "#6b7280",
                fontSize:
                  "14px",
              }}
            >
              {transactions.length}{" "}
              record
              {transactions.length !==
              1
                ? "s"
                : ""}
            </span>
          </div>

          {loading ? (
            <p>
              Loading transactions...
            </p>
          ) : transactions.length ===
            0 ? (
            <p>
              No payment transactions
              found.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width:
                    "100%",
                  borderCollapse:
                    "collapse",
                  minWidth:
                    "1250px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={
                        thStyle
                      }
                    >
                      PO Number
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Retailer
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Supplier
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Amount
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Payment
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Transfer
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Payout
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Order
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Payment ID
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(
                    (
                      transaction
                    ) => (
                      <tr
                        key={
                          transaction.paymentTransactionId
                        }
                      >
                        <td
                          style={
                            tdStyle
                          }
                        >
                          {
                            transaction.poNumber
                          }
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <div
                            style={{
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              transaction.retailerName
                            }
                          </div>

                          {transaction.retailerEmail && (
                            <div
                              style={{
                                marginTop:
                                  "4px",
                                color:
                                  "#6b7280",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {
                                transaction.retailerEmail
                              }
                            </div>
                          )}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <div
                            style={{
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              transaction.supplierName
                            }
                          </div>
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {formatCurrency(
                            transaction.amount
                          )}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <StatusBadge
                            value={
                              transaction.paymentStatus
                            }
                          />
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <StatusBadge
                            value={
                              transaction.transferStatus
                            }
                          />
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {transaction.payout ? (
                            <div>
                              <StatusBadge
                                value={
                                  transaction
                                    .payout
                                    .status
                                }
                              />

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  fontSize:
                                    "12px",
                                  color:
                                    "#6b7280",
                                }}
                              >
                                {
                                  transaction
                                    .payout
                                    .method
                                }
                              </div>
                            </div>
                          ) : (
                            <span
                              style={{
                                color:
                                  "#9ca3af",
                              }}
                            >
                              Not created
                            </span>
                          )}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {statusLabel(
                            transaction.orderStatus
                          )}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <span
                            style={{
                              fontSize:
                                "12px",
                              color:
                                "#4b5563",
                            }}
                          >
                            {
                              transaction
                                .razorpayPaymentId
                            }
                          </span>
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {formatDate(
                            transaction.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SELECTED PAYMENT DETAILS */}
        {summary && (
          <section
            style={{
              marginTop:
                "22px",
              background:
                "#ffffff",
              border:
                "1px solid #e5e7eb",
              borderRadius:
                "14px",
              padding: "20px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Monitoring Status
            </h2>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              <InfoRow
                title="Failed Payments"
                value={
                  summary.failedPayments
                }
              />

              <InfoRow
                title="Refunded Payments"
                value={
                  summary.refundedPayments
                }
              />

              <InfoRow
                title="Pending Payout Value"
                value={formatCurrency(
                  summary.pendingPayoutValue
                )}
              />

              <InfoRow
                title="Completed Payout Value"
                value={formatCurrency(
                  summary.completedPayoutValue
                )}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e5e7eb",
        borderRadius:
          "14px",
        padding: "18px",
        boxShadow:
          "0 3px 10px rgba(0, 0, 0, 0.05)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize:
            "13px",
          color:
            "#6b7280",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin:
            "8px 0 0",
          fontSize:
            "24px",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function InfoRow({
  title,
  value,
}) {
  return (
    <div
      style={{
        border:
          "1px solid #e5e7eb",
        borderRadius:
          "10px",
        padding:
          "16px",
        background:
          "#fafafa",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize:
            "13px",
          color:
            "#6b7280",
        }}
      >
        {title}
      </p>

      <p
        style={{
          margin:
            "8px 0 0",
          fontSize:
            "18px",
          fontWeight:
            700,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  value,
}) {
  return (
    <span
      style={{
        display:
          "inline-block",
        padding:
          "5px 9px",
        borderRadius:
          "999px",
        background:
          "#f3f4f6",
        fontSize:
          "12px",
        fontWeight:
          600,
      }}
    >
      {statusLabel(value)}
    </span>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px",
  background: "#f9fafb",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "13px",
  whiteSpace:
    "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom:
    "1px solid #f0f0f0",
  fontSize: "13px",
  verticalAlign:
    "top",
};

export default AdminDashboard;