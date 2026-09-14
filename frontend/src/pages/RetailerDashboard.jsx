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

  // ---------------------------------------------------------
  // LOAD INVENTORY
  // ---------------------------------------------------------

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const data = await getInventory(getToken);

      setInventory(data.inventory || []);
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

  // ---------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // ADD / UPDATE PRODUCT
  // ---------------------------------------------------------

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

      resetForm();
    } catch (error) {
      console.error("Inventory save error:", error);

      setError(error.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // DELETE PRODUCT
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------

  const categories = [
    ...new Set(
      inventory
        .map((item) => item.category)
        .filter(Boolean)
    ),
  ];

  // ---------------------------------------------------------
  // SEARCH + FILTER
  // ---------------------------------------------------------

  const filteredInventory = inventory.filter((item) => {
    const search = searchTerm.toLowerCase().trim();

    const productName = String(item.productName || "").toLowerCase();
    const sku = String(item.sku || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();

    const matchesSearch =
      productName.includes(search) ||
      sku.includes(search) ||
      category.includes(search);

    const matchesCategory =
      categoryFilter === "all" ||
      item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // ---------------------------------------------------------
  // DASHBOARD STATISTICS
  // ---------------------------------------------------------

  const totalProducts = inventory.length;

  const lowStockProducts = inventory.filter(
    (item) =>
      Number(item.quantity) <= Number(item.reorderLevel)
  ).length;

  const outOfStockProducts = inventory.filter(
    (item) => Number(item.quantity) === 0
  ).length;

  const totalInventoryValue = inventory.reduce(
    (total, item) =>
      total +
      Number(item.quantity || 0) *
        Number(item.price || 0),
    0
  );

  // ---------------------------------------------------------
  // FORMAT CURRENCY
  // ---------------------------------------------------------

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  // ---------------------------------------------------------
  // STOCK STATUS
  // ---------------------------------------------------------

  function getStockStatus(item) {
    const quantity = Number(item.quantity);
    const reorderLevel = Number(item.reorderLevel);

    if (quantity === 0) {
      return {
        label: "Out of Stock",
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      };
    }

    if (quantity <= reorderLevel) {
      return {
        label: "Low Stock",
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
      };
    }

    return {
      label: "In Stock",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    };
  }

  // ---------------------------------------------------------
  // SCROLL TO INVENTORY
  // ---------------------------------------------------------

  function goToInventory() {
    document
      .getElementById("inventory-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-200 bg-white lg:block">

        <div className="flex h-24 items-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
              S
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                SupplySync
              </h1>

              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                AI Procurement Platform
              </p>
            </div>

          </div>
        </div>

        <div className="px-4 py-7">

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-1.5">

            {/* DASHBOARD */}

            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-left text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100"
            >
              <span className="text-lg">▦</span>
              Dashboard
            </button>

            {/* INVENTORY */}

            <button
              type="button"
              onClick={goToInventory}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">▤</span>
              Inventory
            </button>

            {/* SUPPLIERS */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/suppliers")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">◉</span>
              Suppliers
            </button>

            {/* DEMAND FORECAST */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/demand-forecast")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">↗</span>
              Demand Forecast
            </button>

            {/* PURCHASE ORDERS */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/purchase-orders")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">□</span>
              Purchase Orders
            </button>

            {/* ANALYTICS */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/analytics")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">▥</span>
              Analytics
            </button>

          </nav>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Account
          </p>

          <nav className="space-y-1.5">

            {/* SETTINGS */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/account-settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">⚙</span>
              Settings
            </button>

            {/* HELP */}

            <button
              type="button"
              onClick={() => (window.location.href = "/retailer/help-support")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-lg">?</span>
              Help & Support
            </button>

          </nav>

        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-slate-50/60 p-4">
          <LogoutButton />
        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="lg:ml-72">

        {/* ===================================================
            TOP HEADER
        ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">

          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">

            <div>
              <p className="text-sm text-gray-500">
                Retailer Portal
              </p>

              <h2 className="text-xl font-semibold text-gray-900">
                Inventory Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-4">

              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 sm:flex"
                title="Notifications"
              >
                🔔
              </button>

              <div className="hidden h-8 w-px bg-gray-200 sm:block" />

              <div className="flex items-center gap-3">

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-gray-800">
                    Retailer
                  </p>

                  <p className="text-xs text-gray-500">
                    Store Manager
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                  R
                </div>

              </div>

            </div>

          </div>

        </header>

        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}

        <div className="p-4 sm:p-6 lg:p-10">

          {/* PAGE TITLE */}

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome back!
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Monitor your inventory and manage your products.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="text-lg">+</span>
              Add Product
            </button>

          </div>

          {/* =================================================
              STAT CARDS
          ================================================== */}

          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Products
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {totalProducts}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                  ▦
                </div>

              </div>

              <p className="mt-4 text-xs text-gray-500">
                Products currently in inventory
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Low Stock
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {lowStockProducts}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600">
                  !
                </div>

              </div>

              <p className="mt-4 text-xs text-amber-600">
                Products need attention
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Out of Stock
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {outOfStockProducts}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
                  ×
                </div>

              </div>

              <p className="mt-4 text-xs text-red-600">
                Immediate replenishment required
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Inventory Value
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrency(totalInventoryValue)}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                  ₹
                </div>

              </div>

              <p className="mt-4 text-xs text-gray-500">
                Estimated current stock value
              </p>

            </div>

          </div>

          {/* =================================================
              ERROR MESSAGE
          ================================================== */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <span className="font-bold">
                !
              </span>

              <div>

                <p className="font-semibold">
                  Something went wrong
                </p>

                <p className="mt-1">
                  {error}
                </p>

              </div>

            </div>
          )}

          {/* =================================================
              INVENTORY SECTION
          ================================================== */}

          <div
            id="inventory-section"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >

            {/* Inventory Header */}

            <div className="border-b border-slate-200 px-5 py-6 sm:px-7">

              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    Inventory
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Manage and monitor all your products.
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {filteredInventory.length}
                  </span>{" "}
                  products
                </div>

              </div>

              {/* Search and Filter */}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                <div className="relative flex-1">

                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder="Search products, SKU or category..."
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >

                  <option value="all">
                    All Categories
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}

                </select>

              </div>

            </div>

            {/* LOADING */}

            {loading && (
              <div className="flex min-h-64 items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                  <p className="mt-3 text-sm text-gray-500">
                    Loading inventory...
                  </p>

                </div>

              </div>
            )}

            {/* EMPTY INVENTORY */}

            {!loading &&
              !error &&
              inventory.length === 0 && (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600">
                    ▦
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No products yet
                  </h3>

                  <p className="mt-2 max-w-sm text-sm text-gray-500">
                    Your inventory is empty. Add your first
                    product to get started.
                  </p>

                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Add Your First Product
                  </button>

                </div>
              )}

            {/* NO SEARCH RESULTS */}

            {!loading &&
              inventory.length > 0 &&
              filteredInventory.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500">
                    ⌕
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    No products found
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your search or category filter.
                  </p>

                </div>
              )}

            {/* INVENTORY TABLE */}

            {!loading && filteredInventory.length > 0 && (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px]">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50/80">

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Product
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        SKU
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Category
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Quantity
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Price
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredInventory.map((item) => {

                      const stockStatus =
                        getStockStatus(item);

                      return (

                        <tr
                          key={item._id}
                          className="transition hover:bg-blue-50/30"
                        >

                          {/* Product */}

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-semibold text-blue-600 ring-1 ring-blue-100">
                                {String(
                                  item.productName || "P"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>

                                <p className="font-semibold text-gray-900">
                                  {item.productName}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-400">
                                  Reorder at{" "}
                                  {item.reorderLevel}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* SKU */}

                          <td className="px-6 py-4">

                            <span className="text-sm font-medium text-gray-600">
                              {item.sku}
                            </span>

                          </td>

                          {/* Category */}

                          <td className="px-6 py-4">

                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                              {item.category}
                            </span>

                          </td>

                          {/* Quantity */}

                          <td className="px-6 py-4">

                            <span
                              className={`text-sm font-semibold ${
                                Number(item.quantity) === 0
                                  ? "text-red-600"
                                  : Number(item.quantity) <=
                                      Number(item.reorderLevel)
                                    ? "text-amber-600"
                                    : "text-gray-900"
                              }`}
                            >
                              {item.quantity}
                            </span>

                          </td>

                          {/* Price */}

                          <td className="px-6 py-4">

                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                Number(item.price || 0)
                              )}
                            </span>

                          </td>

                          {/* Status */}

                          <td className="px-6 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stockStatus.className}`}
                            >
                              {stockStatus.label}
                            </span>

                          </td>

                          {/* Actions */}

                          <td className="px-6 py-4 text-right">

                            <div className="flex justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  handleEditClick(item)
                                }
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(item._id)
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </div>

          {/* =================================================
              LOW STOCK ALERT
          ================================================== */}

          {!loading && lowStockProducts > 0 && (

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">

              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg font-bold text-amber-700">
                  !
                </div>

                <div>

                  <h3 className="font-semibold text-amber-900">
                    Low stock alert
                  </h3>

                  <p className="mt-1 text-sm text-amber-800">
                    You have{" "}
                    <strong>
                      {lowStockProducts}
                    </strong>{" "}
                    product
                    {lowStockProducts !== 1
                      ? "s"
                      : ""}{" "}
                    at or below the reorder level.
                    Consider replenishing these products.
                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

      </main>

      {/* =====================================================
          ADD / EDIT PRODUCT MODAL
      ====================================================== */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">

          <div
            className="absolute inset-0"
            onClick={() => {
              if (!submitting) {
                resetForm();
              }
            }}
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal Header */}

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Edit Product"
                    : "Add New Product"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Update the product information below."
                    : "Enter the details for your new inventory item."}
                </p>

              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                ×
              </button>

            </div>

            {/* Modal Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Product Name */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Product Name
                  </label>

                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    placeholder="e.g. Laptop"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />

                </div>

                {/* SKU */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    SKU
                  </label>

                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. LAP-001"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* Category */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Category
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g. Electronics"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* Quantity */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="e.g. 25"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* Price */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Price
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="e.g. 55000"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />

                  </div>

                </div>

                {/* Reorder Level */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Reorder Level
                  </label>

                  <input
                    type="number"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="e.g. 10"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    A low-stock alert appears when quantity
                    reaches this level.
                  </p>

                </div>

              </div>

              {/* Form Buttons */}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Product"
                      : "Add Product"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default RetailerDashboard;