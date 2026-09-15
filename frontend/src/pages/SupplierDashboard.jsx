import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

import { getSupplierDashboard } from "../api/supplierDashboardApi";
import LogoutButton from "../components/LogoutButton";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function statusLabel(status) {
  if (!status) return "-";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function SupplierDashboard() {
  const { getToken } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getSupplierDashboard(getToken);

      setDashboard(data);
    } catch (requestError) {
      console.error(
        "Supplier dashboard load error:",
        requestError
      );

      setError(
        requestError.message ||
          "Failed to load supplier dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [getToken]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Supplier Dashboard</h1>
        <p>Loading supplier data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Supplier Dashboard</h1>

        <p style={{ color: "crimson" }}>
          {error}
        </p>

        <button
          type="button"
          onClick={loadDashboard}
        >
          Retry
        </button>

        <div style={{ marginTop: "20px" }}>
          <LogoutButton />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const supplier = dashboard.supplier;
  const summary = dashboard.summary;

  const purchaseOrders =
    dashboard.purchaseOrders || [];

  const payments =
    dashboard.payments || [];

  const payouts =
    dashboard.payouts || [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>
              Supplier Dashboard
            </h1>

            <p style={{ margin: "8px 0 0" }}>
              {supplier.supplierName}
            </p>

            <p
              style={{
                margin: "4px 0 0",
                color: "#6b7280",
              }}
            >
              {supplier.contactPerson} •{" "}
              {supplier.email} •{" "}
              {supplier.phone}
            </p>
          </div>

          <LogoutButton />
        </div>

        {/* SUMMARY */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          <div style={cardStyle}>
            <p style={labelStyle}>
              Products
            </p>

            <h2 style={valueStyle}>
              {summary.totalProducts}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Orders
            </p>

            <h2 style={valueStyle}>
              {summary.totalOrders}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Retailers
            </p>

            <h2 style={valueStyle}>
              {summary.totalRetailers}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Order Value
            </p>

            <h2 style={valueStyle}>
              {formatCurrency(
                summary.totalOrderValue
              )}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Paid Value
            </p>

            <h2 style={valueStyle}>
              {formatCurrency(
                summary.totalPaidValue
              )}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Pending Payout
            </p>

            <h2 style={valueStyle}>
              {formatCurrency(
                summary.pendingPayoutValue
              )}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>
              Completed Payout
            </p>

            <h2 style={valueStyle}>
              {formatCurrency(
                summary.completedPayoutValue
              )}
            </h2>
          </div>
        </div>

        {/* SUPPLIER PROFILE */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Supplier Profile
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            <Info title="Lead Time">
              {supplier.leadTimeDays} days
            </Info>

            <Info title="Reliability Score">
              {supplier.reliabilityScore}
            </Info>

            <Info title="Rating">
              {supplier.rating}
            </Info>

            <Info title="Status">
              {supplier.active
                ? "Active"
                : "Inactive"}
            </Info>
          </div>
        </section>

        {/* PRODUCTS */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Products You Sell
          </h2>

          {supplier.products?.length ? (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      Product
                    </th>

                    <th style={thStyle}>
                      SKU
                    </th>

                    <th style={thStyle}>
                      Category
                    </th>

                    <th style={thStyle}>
                      Unit Price
                    </th>

                    <th style={thStyle}>
                      MOQ
                    </th>

                    <th style={thStyle}>
                      Available Stock
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {supplier.products.map(
                    (product) => (
                      <tr key={product.sku}>
                        <td style={tdStyle}>
                          {product.productName}
                        </td>

                        <td style={tdStyle}>
                          {product.sku}
                        </td>

                        <td style={tdStyle}>
                          {product.category}
                        </td>

                        <td style={tdStyle}>
                          {formatCurrency(
                            product.unitPrice
                          )}
                        </td>

                        <td style={tdStyle}>
                          {
                            product.minimumOrderQuantity
                          }
                        </td>

                        <td style={tdStyle}>
                          {
                            product.availableQuantity
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No products available.</p>
          )}
        </section>

        {/* PURCHASE ORDERS */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Incoming Purchase Orders
          </h2>

          {purchaseOrders.length ? (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      PO Number
                    </th>

                    <th style={thStyle}>
                      Retailer
                    </th>

                    <th style={thStyle}>
                      Items
                    </th>

                    <th style={thStyle}>
                      Amount
                    </th>

                    <th style={thStyle}>
                      Order Status
                    </th>

                    <th style={thStyle}>
                      Payment
                    </th>

                    <th style={thStyle}>
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {purchaseOrders.map(
                    (order) => (
                      <tr key={order._id}>
                        <td style={tdStyle}>
                          {order.poNumber}
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              fontWeight: 600,
                            }}
                          >
                            {order.retailerName ||
                              order.retailerUserId ||
                              "-"}
                          </div>

                          {order.retailerEmail && (
                            <div
                              style={{
                                marginTop:
                                  "4px",
                                color:
                                  "#6b7280",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {
                                order.retailerEmail
                              }
                            </div>
                          )}
                        </td>

                        <td style={tdStyle}>
                          {order.items?.length ||
                            0}
                        </td>

                        <td style={tdStyle}>
                          {formatCurrency(
                            order.totalAmount
                          )}
                        </td>

                        <td style={tdStyle}>
                          {statusLabel(
                            order.orderStatus
                          )}
                        </td>

                        <td style={tdStyle}>
                          {statusLabel(
                            order.paymentStatus
                          )}
                        </td>

                        <td style={tdStyle}>
                          {formatDate(
                            order.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No purchase orders yet.</p>
          )}
        </section>

        {/* PAYMENT HISTORY */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Payment History
          </h2>

          {payments.length ? (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      PO Number
                    </th>

                    <th style={thStyle}>
                      Amount
                    </th>

                    <th style={thStyle}>
                      Payment Status
                    </th>

                    <th style={thStyle}>
                      Transfer Status
                    </th>

                    <th style={thStyle}>
                      Payment ID
                    </th>

                    <th style={thStyle}>
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td style={tdStyle}>
                        {payment.poNumber}
                      </td>

                      <td style={tdStyle}>
                        {formatCurrency(
                          payment.amount
                        )}
                      </td>

                      <td style={tdStyle}>
                        {statusLabel(
                          payment.paymentStatus
                        )}
                      </td>

                      <td style={tdStyle}>
                        {statusLabel(
                          payment.transferStatus
                        )}
                      </td>

                      <td style={tdStyle}>
                        {payment.razorpayPaymentId ||
                          "-"}
                      </td>

                      <td style={tdStyle}>
                        {formatDate(
                          payment.createdAt
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              No payment transactions yet.
            </p>
          )}
        </section>

        {/* PAYOUT HISTORY */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Payout History
          </h2>

          <p
            style={{
              marginTop: 0,
              color: "#6b7280",
            }}
          >
            Payouts are currently tracked in
            SupplySync as an internal simulated
            payout ledger.
          </p>

          {payouts.length ? (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>
                      PO Number
                    </th>

                    <th style={thStyle}>
                      Amount
                    </th>

                    <th style={thStyle}>
                      Status
                    </th>

                    <th style={thStyle}>
                      Method
                    </th>

                    <th style={thStyle}>
                      Reference
                    </th>

                    <th style={thStyle}>
                      Processed
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout._id}>
                      <td style={tdStyle}>
                        {payout.poNumber}
                      </td>

                      <td style={tdStyle}>
                        {formatCurrency(
                          payout.amount
                        )}
                      </td>

                      <td style={tdStyle}>
                        {statusLabel(
                          payout.payoutStatus
                        )}
                      </td>

                      <td style={tdStyle}>
                        {statusLabel(
                          payout.payoutMethod
                        )}
                      </td>

                      <td style={tdStyle}>
                        {payout.referenceId ||
                          "-"}
                      </td>

                      <td style={tdStyle}>
                        {formatDate(
                          payout.processedAt
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No payouts yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Info({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px",
        background: "#fafafa",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "#6b7280",
        }}
      >
        {title}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          fontSize: "18px",
          fontWeight: 700,
        }}
      >
        {children}
      </p>
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "18px",
  boxShadow:
    "0 3px 10px rgba(0, 0, 0, 0.05)",
};

const labelStyle = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const valueStyle = {
  margin: "8px 0 0",
  fontSize: "24px",
};

const sectionStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "18px",
  marginBottom: "22px",
};

const sectionHeadingStyle = {
  marginTop: 0,
  marginBottom: "16px",
};

const tableWrapperStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: "13px",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "14px",
};

export default SupplierDashboard;