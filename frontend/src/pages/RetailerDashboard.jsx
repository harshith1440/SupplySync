import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

import {
  getInventory,
  getLowStockInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../api/inventoryApi";

import LogoutButton from "../components/LogoutButton";

function RetailerDashboard() {
  const { getToken } = useAuth();

  const [inventory, setInventory] = useState([]);
  const [lowStockInventory, setLowStockInventory] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productName: "",
    sku: "",
    category: "",
    quantity: "",
    price: "",
    reorderLevel: "10",
  });

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const data = await getInventory(getToken);

      setInventory(data.inventory);
    } catch (error) {
      console.error("Inventory error:", error);
      setError(error.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStockInventory() {
    try {
      setLowStockLoading(true);

      const data = await getLowStockInventory(getToken);

      setLowStockInventory(data.inventory);
    } catch (error) {
      console.error("Low-stock inventory error:", error);
      setError(error.message || "Failed to load low-stock inventory");
    } finally {
      setLowStockLoading(false);
    }
  }

  async function loadDashboardData() {
    await Promise.all([
      loadInventory(),
      loadLowStockInventory(),
    ]);
  }

  useEffect(() => {
    loadDashboardData();
  }, [getToken]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      productName: "",
      sku: "",
      category: "",
      quantity: "",
      price: "",
      reorderLevel: "10",
    });

    setEditingId(null);
    setShowForm(false);
  }

  function handleAddClick() {
    setEditingId(null);

    setFormData({
      productName: "",
      sku: "",
      category: "",
      quantity: "",
      price: "",
      reorderLevel: "10",
    });

    setError("");
    setShowForm(true);
  }

  function handleEditClick(item) {
    setEditingId(item._id);

    setFormData({
      productName: item.productName,
      sku: item.sku,
      category: item.category,
      quantity: String(item.quantity),
      price: String(item.price),
      reorderLevel: String(item.reorderLevel),
    });

    setError("");
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const product = {
        productName: formData.productName,
        sku: formData.sku,
        category: formData.category,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        reorderLevel: Number(formData.reorderLevel),
      };

      if (editingId) {
        const data = await updateInventoryItem(
          editingId,
          product,
          getToken
        );

        setInventory((currentInventory) =>
          currentInventory.map((item) =>
            item._id === editingId ? data.inventory : item
          )
        );
      } else {
        const data = await createInventoryItem(product, getToken);

        setInventory((currentInventory) => [
          data.inventory,
          ...currentInventory,
        ]);
      }

      await loadLowStockInventory();

      resetForm();
    } catch (error) {
      console.error("Inventory save error:", error);
      setError(error.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteInventoryItem(id, getToken);

      setInventory((currentInventory) =>
        currentInventory.filter((item) => item._id !== id)
      );

      await loadLowStockInventory();
    } catch (error) {
      console.error("Delete inventory error:", error);
      setError(error.message || "Failed to delete product");
    }
  }

  const categories = [
    ...new Set(inventory.map((item) => item.category)),
  ];

  const filteredInventory = inventory.filter((item) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      item.productName.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search);

    const matchesCategory =
      categoryFilter === "all" ||
      item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div>
        <h1>Retailer Dashboard</h1>
        <LogoutButton />
      </div>

      <hr />

      <div>
        <h2>Inventory</h2>

        <button onClick={handleAddClick}>
          + Add Product
        </button>
      </div>

      {error && <p>{error}</p>}

      <div>
        <h3>Low Stock</h3>

        {lowStockLoading ? (
          <p>Checking stock levels...</p>
        ) : (
          <>
            <p>
              {lowStockInventory.length} product
              {lowStockInventory.length !== 1 ? "s" : ""} currently
              need{lowStockInventory.length === 1 ? "s" : ""} restocking.
            </p>

            {lowStockInventory.length > 0 && (
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                  </tr>
                </thead>

                <tbody>
                  {lowStockInventory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.productName}</td>
                      <td>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>{item.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <hr />

      {showForm && (
        <div>
          <h3>
            {editingId ? "Edit Product" : "Add New Product"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div>
              <label>Product Name</label>
              <br />
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleInputChange}
                placeholder="e.g. Laptop"
                required
              />
            </div>

            <br />

            <div>
              <label>SKU</label>
              <br />
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="e.g. LAP-001"
                required
              />
            </div>

            <br />

            <div>
              <label>Category</label>
              <br />
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g. Electronics"
                required
              />
            </div>

            <br />

            <div>
              <label>Quantity</label>
              <br />
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 25"
                required
              />
            </div>

            <br />

            <div>
              <label>Price</label>
              <br />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g. 55000"
                required
              />
            </div>

            <br />

            <div>
              <label>Reorder Level</label>
              <br />
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 10"
                required
              />
            </div>

            <br />

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Product"
                  : "Add Product"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <hr />

      <div>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        {" "}

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          <option value="all">All Categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <br />

      {loading && <p>Loading inventory...</p>}

      {!loading && !error && inventory.length === 0 && (
        <div>
          <h3>No products yet</h3>
          <p>
            Your inventory is empty. Add your first product to get started.
          </p>
        </div>
      )}

      {!loading &&
        inventory.length > 0 &&
        filteredInventory.length === 0 && (
          <p>No products match your search or filter.</p>
        )}

      {!loading && filteredInventory.length > 0 && (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredInventory.map((item) => {
              const isLowStock = lowStockInventory.some(
                (lowStockItem) =>
                  lowStockItem._id === item._id
              );

              return (
                <tr
                  key={item._id}
                  style={
                    isLowStock
                      ? {
                          backgroundColor: "#ffe5e5",
                        }
                      : {}
                  }
                >
                  <td>{item.productName}</td>

                  <td>{item.sku}</td>

                  <td>{item.category}</td>

                  <td>{item.quantity}</td>

                  <td>₹{item.price}</td>

                  <td>{item.reorderLevel}</td>

                  <td>
                    {isLowStock ? (
                      <strong>⚠️ LOW STOCK</strong>
                    ) : (
                      "✓ Normal"
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        handleEditClick(item)
                      }
                    >
                      Edit
                    </button>

                    {" "}

                    <button
                      onClick={() =>
                        handleDelete(item._id)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RetailerDashboard;