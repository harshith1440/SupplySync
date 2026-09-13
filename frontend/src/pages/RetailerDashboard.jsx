import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../api/inventoryApi";

import LogoutButton from "../components/LogoutButton";

function RetailerDashboard() {
  const { getToken } = useAuth();

  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadInventory();
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

      // UPDATE
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
      }

      // CREATE
      else {
        const data = await createInventoryItem(product, getToken);

        setInventory((currentInventory) => [
          data.inventory,
          ...currentInventory,
        ]);
      }

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
    } catch (error) {
      console.error("Delete inventory error:", error);

      setError(error.message || "Failed to delete product");
    }
  }

  // Get unique categories
  const categories = [
    ...new Set(inventory.map((item) => item.category)),
  ];

  // Search + category filtering
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
      {/* Dashboard Header */}
      <div>
        <h1>Retailer Dashboard</h1>

        <LogoutButton />
      </div>

      <hr />

      {/* Inventory Header */}
      <div>
        <h2>Inventory</h2>

        <button onClick={handleAddClick}>
          + Add Product
        </button>
      </div>

      {/* Error Message */}
      {error && <p>{error}</p>}

      {/* Add / Edit Form */}
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

      {/* Search and Filter */}
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

      {/* Loading */}
      {loading && <p>Loading inventory...</p>}

      {/* Empty Inventory */}
      {!loading && !error && inventory.length === 0 && (
        <div>
          <h3>No products yet</h3>

          <p>
            Your inventory is empty. Add your first product to get started.
          </p>
        </div>
      )}

      {/* No Search/Filter Results */}
      {!loading &&
        inventory.length > 0 &&
        filteredInventory.length === 0 && (
          <p>No products match your search or filter.</p>
        )}

      {/* Inventory Table */}
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
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredInventory.map((item) => (
              <tr key={item._id}>
                <td>{item.productName}</td>

                <td>{item.sku}</td>

                <td>{item.category}</td>

                <td>{item.quantity}</td>

                <td>₹{item.price}</td>

                <td>{item.reorderLevel}</td>

                <td>
                  <button onClick={() => handleEditClick(item)}>
                    Edit
                  </button>

                  {" "}

                  <button onClick={() => handleDelete(item._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RetailerDashboard;