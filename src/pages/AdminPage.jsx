import { useState, useEffect } from "react";

const API = "https://sokoni-1-4i1f.onrender.com/api";

function getToken() {
  return localStorage.getItem("sokoni_token") || "";
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

const EMPTY = {
  product_name: "",
  product_cost: "",
  product_desc: "",
  stock: "",
};

export default function AdminPage({ user, showToast }) {
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [form, setForm]                 = useState(EMPTY);
  const [photoFile, setPhotoFile]       = useState(null);
  const [editId, setEditId]             = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [deleteId, setDeleteId]         = useState(null);
  const [panel, setPanel]               = useState("products");
  const [dashStats, setDashStats]       = useState(null);
  const [users, setUsers]               = useState([]);
  const [userSearch, setUserSearch]     = useState("");   // ✅ FIX 1: was missing
  const [suppliers, setSuppliers]       = useState([]);
  const [adminForm, setAdminForm]       = useState({ username: "", email: "", password: "" });
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // guard 
  if (!user || user.role !== "admin") {
    return (
      <div style={styles.forbidden}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ color: "#0A2E6E", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          Admin access only
        </h2>
        <p style={{ color: "#6B7280" }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  // data loaders
  async function loadDashboard() {
    try {
      const res  = await fetch(`${API}/admin/dashboard`, { headers: authHeaders() });
      const data = await res.json();
      setDashStats(data);
    } catch {
      showToast("Failed to load dashboard", "error");
    }
  }

  async function loadUsers(q = "") {
    try {
      const url = q
        ? `${API}/admin/users?search=${encodeURIComponent(q)}`
        : `${API}/admin/users`;
      const res  = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      showToast("Failed to load users", "error");
    }
  }

  async function loadSuppliers() {
    try {
      const res  = await fetch(`${API}/admin/suppliers?approved=0`, { headers: authHeaders() });
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {
      showToast("Failed to load suppliers", "error");
    }
  }

  async function loadProducts(q = "") {
    setLoading(true);
    try {
      const url = q
        ? `${API}/products/?search=${encodeURIComponent(q)}&limit=100`
        : `${API}/products/?limit=100`;
      const res  = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }

  //  effects 
  useEffect(() => {
    if (panel === "dashboard") loadDashboard();
    if (panel === "users")     loadUsers();
    if (panel === "suppliers") loadSuppliers();
    if (panel === "products")  loadProducts();
  }, [panel]);

  // Debounced product search
  useEffect(() => {
    const t = setTimeout(() => loadProducts(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Debounced user search
  useEffect(() => {
    const t = setTimeout(() => loadUsers(userSearch), 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  //  user actions 
  async function toggleActive(userId, currentStatus) {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/toggle-active`, {
        method: "PATCH", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      setUsers(u =>
        u.map(x => x.user_id === userId ? { ...x, is_active: currentStatus ? 0 : 1 } : x)
      );
      showToast("User status updated", "success");
    } catch {
      showToast("Failed to update user", "error");
    }
  }

  async function deleteUser(userId) {
    try {
      const res = await fetch(`${API}/admin/users/${userId}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      setUsers(u => u.filter(x => x.user_id !== userId));
      showToast("User deleted", "success");
    } catch {
      showToast("Failed to delete user", "error");
    }
  }

  async function approveSupplier(userId) {
    try {
      const res = await fetch(`${API}/admin/suppliers/${userId}/approve`, {
        method: "PATCH", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      setSuppliers(s => s.filter(x => x.user_id !== userId));
      showToast("Supplier approved!", "success");
    } catch {
      showToast("Failed to approve supplier", "error");
    }
  }

  async function handleCreateAdmin() {
    if (!adminForm.username || !adminForm.email || !adminForm.password) {
      showToast("All fields required", "warn");
      return;
    }
    setAdminSubmitting(true);
    try {
      const res  = await fetch(`${API}/admin/create-admin`, {
        method:  "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body:    JSON.stringify(adminForm),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed", "error"); return; }
      showToast(`Admin account created for ${adminForm.username}!`, "success");
      setAdminForm({ username: "", email: "", password: "" });
    } catch {
      showToast("Network error. Try again.", "error");
    } finally {
      setAdminSubmitting(false);
    }
  }

  //  product form helpers 
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setPhotoFile(null);
    setPanel("add");
  }

  function openEdit(p) {
    setEditId(p.product_id);
    setForm({
      product_name: p.product_name,
      product_cost: p.product_cost,
      product_desc: p.product_desc || "",
      stock:        p.stock,
    });
    setPhotoFile(null);
    setPanel("add");
  }

  async function handleSubmit() {
    if (!form.product_name.trim()) { showToast("Product name required", "warn"); return; }
    if (!form.product_cost)        { showToast("Price required", "warn"); return; }

    setSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`${API}/products/${editId}`, {
          method:  "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body:    JSON.stringify({
            product_name: form.product_name,
            product_cost: parseFloat(form.product_cost),
            product_desc: form.product_desc,
            stock:        parseInt(form.stock) || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        showToast("Product updated ✓", "success");
      } else {
        const fd = new FormData();
        fd.append("product_name", form.product_name);
        fd.append("product_cost", parseFloat(form.product_cost));
        fd.append("product_desc", form.product_desc);
        fd.append("stock",        parseInt(form.stock) || 0);
        if (photoFile) fd.append("product_photo", photoFile);

        const res = await fetch(`${API}/products/`, {
          method:  "POST",
          headers: authHeaders(),
          body:    fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Add failed");
        showToast("Product added ✓", "success");
      }

      setPanel("products");
      setForm(EMPTY);
      setEditId(null);
      loadProducts(search);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      const res  = await fetch(`${API}/products/${id}`, {
        method:  "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      showToast("Product deleted", "success");
      setDeleteId(null);
      loadProducts(search);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  //  render 
  return (
    <div style={styles.page}>

      {/* ── sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          SOKONI<span style={{ color: "#F5C518" }}>ADMIN</span>
        </div>
        <nav style={{ marginTop: 32 }}>
          {[
            { id: "dashboard",    icon: "📊", label: "Dashboard" },
            { id: "products",     icon: "📦", label: "Products" },
            { id: "add",          icon: "➕", label: editId ? "Edit Product" : "Add Product" },
            { id: "users",        icon: "👥", label: "Users" },
            { id: "suppliers",    icon: "🏭", label: "Suppliers" },
            { id: "create-admin", icon: "🔑", label: "Create Admin" },
          ].map(item => (
            <div
              key={item.id}
              style={{
                ...styles.sidebarItem,
                background: panel === item.id ? "rgba(245,197,24,0.15)" : "transparent",
                color:      panel === item.id ? "#F5C518" : "#94A3B8",
                fontWeight: panel === item.id ? 700 : 500,
              }}
              onClick={() => {
                if (item.id === "add") openAdd();
                else setPanel(item.id);   // ✅ FIX 2: was always setting "products"
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.adminBadge}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 13 }}>{user.username}</div>
            <div style={{ color: "#64748B", fontSize: 11 }}>Administrator</div>
          </div>
        </div>
      </aside>

      {/* ── main ── */}
      <main style={styles.main}>

        {/* DASHBOARD PANEL */}
        {panel === "dashboard" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>Dashboard</h1>
                <p style={styles.pageSub}>Platform overview</p>
              </div>
            </div>
            {dashStats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Total Orders",      value: dashStats.orders.total_orders },
                  { label: "Total Revenue",      value: `KES ${Number(dashStats.orders.total_revenue).toLocaleString()}` },
                  { label: "Pending Orders",     value: dashStats.orders.pending_orders },
                  { label: "Total Users",        value: dashStats.users.total_users },
                  { label: "Suppliers",          value: dashStats.users.total_suppliers },
                  { label: "Pending Suppliers",  value: dashStats.users.pending_suppliers },
                  { label: "Total Products",     value: dashStats.products.total_products },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", borderLeft: "4px solid #F5C800", boxShadow: "0 2px 8px rgba(10,46,110,0.06)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "#0A2E6E" }}>{k.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.center}>Loading dashboard...</div>
            )}
          </>
        )}

        {/* PRODUCTS PANEL */}
        {panel === "products" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>Products</h1>
                <p style={styles.pageSub}>{products.length} items in catalogue</p>
              </div>
              <button style={styles.btnPrimary} onClick={openAdd}>+ Add Product</button>
            </div>
            <div style={styles.searchWrap}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div style={styles.center}>Loading products...</div>
            ) : products.length === 0 ? (
              <div style={styles.center}>No products found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["#", "Product", "Price (KES)", "Stock", "Added", "Actions"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.product_id} style={styles.tr}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 700, color: "#0A2E6E" }}>{p.product_name}</div>
                          {p.product_desc && (
                            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                              {p.product_desc.slice(0, 60)}{p.product_desc.length > 60 ? "…" : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 700, color: "#0A2E6E" }}>
                          {Number(p.product_cost).toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: p.stock > 10 ? "#D1FAE5" : p.stock > 0 ? "#FEF3C7" : "#FEE2E2",
                            color:      p.stock > 10 ? "#065F46" : p.stock > 0 ? "#92400E" : "#991B1B",
                          }}>
                            {p.stock} units
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: "#6B7280", fontSize: 13 }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={styles.btnEdit}   onClick={() => openEdit(p)}>Edit</button>
                            <button style={styles.btnDelete} onClick={() => setDeleteId(p.product_id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ADD / EDIT PANEL */}
        {panel === "add" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>{editId ? "Edit Product" : "Add New Product"}</h1>
                <p style={styles.pageSub}>{editId ? `Editing product #${editId}` : "Fill in the details below"}</p>
              </div>
              <button style={styles.btnSecondary} onClick={() => setPanel("products")}>
                ← Back to Products
              </button>
            </div>
            <div style={styles.formCard}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Name *</label>
                <input
                  style={styles.input}
                  placeholder="e.g. Unga Pembe 2kg"
                  value={form.product_name}
                  onChange={e => set("product_name", e.target.value)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Price (KES) *</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 250"
                    value={form.product_cost}
                    onChange={e => set("product_cost", e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stock (units)</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 100"
                    value={form.stock}
                    onChange={e => set("stock", e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={{ ...styles.input, height: 90, resize: "vertical" }}
                  placeholder="Optional product description..."
                  value={form.product_desc}
                  onChange={e => set("product_desc", e.target.value)}
                />
              </div>
              {!editId && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Product Photo</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={styles.input}
                    onChange={e => setPhotoFile(e.target.files[0] || null)}
                  />
                  {photoFile && (
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                      Selected: {photoFile.name}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                    Allowed: PNG, JPG, WEBP, GIF
                  </div>
                </div>
              )}
              {editId && (
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8 }}>
                  ℹ️ Photo cannot be changed during edit. Delete and re-add the product to update the image.
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editId ? "Save Changes" : "Add Product"}
                </button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => { setPanel("products"); setEditId(null); setForm(EMPTY); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* USERS PANEL */}
        {panel === "users" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>Users</h1>
                <p style={styles.pageSub}>{users.length} registered users</p>
              </div>
            </div>
            <div style={styles.searchWrap}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input
                style={styles.searchInput}
                placeholder="Search by username, email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Username", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 700, color: "#0A2E6E" }}>{u.username}</td>
                      <td style={{ ...styles.td, color: "#6B7280" }}>{u.email}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: u.role === "supplier" ? "#EFF6FF" : u.role === "admin" ? "#FDF4FF" : "#F0FDF4",
                          color:      u.role === "supplier" ? "#1D4ED8" : u.role === "admin" ? "#7E22CE" : "#15803D",
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: u.is_active ? "#D1FAE5" : "#FEE2E2",
                          color:      u.is_active ? "#065F46" : "#991B1B",
                        }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ ...styles.td, color: "#6B7280", fontSize: 13 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={styles.btnEdit} onClick={() => toggleActive(u.user_id, u.is_active)}>
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button style={styles.btnDelete} onClick={() => deleteUser(u.user_id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SUPPLIERS PANEL */}
        {panel === "suppliers" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>Pending Suppliers</h1>
                <p style={styles.pageSub}>{suppliers.length} awaiting approval</p>
              </div>
            </div>
            {suppliers.length === 0 ? (
              <div style={styles.center}>No pending suppliers 🎉</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Business", "Username", "Email", "Phone", "Country", "Joined", "Action"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(s => (
                      <tr key={s.user_id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 700, color: "#0A2E6E" }}>{s.business_name || "—"}</td>
                        <td style={styles.td}>{s.username}</td>
                        <td style={{ ...styles.td, color: "#6B7280" }}>{s.email}</td>
                        <td style={styles.td}>{s.phone}</td>
                        <td style={styles.td}>{s.country}</td>
                        <td style={{ ...styles.td, color: "#6B7280", fontSize: 13 }}>
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.btnEdit, background: "#D1FAE5", color: "#065F46" }}
                            onClick={() => approveSupplier(s.user_id)}
                          >
                            ✓ Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* CREATE ADMIN PANEL — ✅ FIX 3: moved inside <main> */}
        {panel === "create-admin" && (
          <>
            <div style={styles.topbar}>
              <div>
                <h1 style={styles.pageTitle}>Create Admin</h1>
                <p style={styles.pageSub}>Add a new administrator account</p>
              </div>
            </div>
            <div style={styles.formCard}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Username</label>
                <input
                  style={styles.input}
                  placeholder="admin_username"
                  value={adminForm.username}
                  onChange={e => setAdminForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="admin@sokoni.co.ke"
                  value={adminForm.email}
                  onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Min 8 chars, uppercase, number, special"
                  value={adminForm.password}
                  onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <button
                style={{ ...styles.btnPrimary, opacity: adminSubmitting ? 0.6 : 1 }}
                disabled={adminSubmitting}
                onClick={handleCreateAdmin}
              >
                {adminSubmitting ? "Creating..." : "Create Admin Account"}
              </button>
            </div>
          </>
        )}

      </main>

      {/* ── delete confirm dialog ── */}
      {deleteId && (
        <div style={styles.overlay} onClick={() => setDeleteId(null)}>
          <div style={styles.dialog} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: "#0A2E6E", fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 8 }}>
              Delete product?
            </h3>
            <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 24 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={styles.btnDelete} onClick={() => handleDelete(deleteId)}>
                Yes, delete
              </button>
              <button style={styles.btnSecondary} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:         { display: "flex", minHeight: "100vh", background: "#F8FAFC" },
  sidebar:      { width: 220, background: "#0A2E6E", display: "flex", flexDirection: "column", padding: "24px 16px", position: "sticky", top: 0, height: "100vh" },
  sidebarLogo:  { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 18, color: "#fff", letterSpacing: 1 },
  sidebarItem:  { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontSize: 14, marginBottom: 4, transition: "all 0.15s" },
  sidebarFooter:{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 },
  adminBadge:   { width: 36, height: 36, borderRadius: "50%", background: "#F5C518", color: "#0A2E6E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15 },
  main:         { flex: 1, padding: "32px 36px", maxWidth: 1100 },
  topbar:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  pageTitle:    { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 24, fontWeight: 800, color: "#0A2E6E", margin: 0 },
  pageSub:      { color: "#6B7280", fontSize: 14, marginTop: 4 },
  searchWrap:   { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "10px 14px", marginBottom: 20 },
  searchInput:  { border: "none", outline: "none", fontSize: 14, flex: 1, background: "transparent" },
  table:        { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(10,46,110,0.06)" },
  th:           { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", textTransform: "uppercase", letterSpacing: 0.5 },
  tr:           { borderBottom: "1px solid #F3F4F6" },
  td:           { padding: "14px 16px", fontSize: 14, color: "#374151", verticalAlign: "middle" },
  badge:        { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  formCard:     { background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(10,46,110,0.06)", maxWidth: 620 },
  formGroup:    { marginBottom: 18 },
  label:        { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input:        { width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  btnPrimary:   { background: "#0A2E6E", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnSecondary: { background: "#F1F5F9", color: "#374151", border: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  btnEdit:      { background: "#EFF6FF", color: "#1D4ED8", border: "none", padding: "6px 14px", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnDelete:    { background: "#FEE2E2", color: "#991B1B", border: "none", padding: "6px 14px", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  center:       { textAlign: "center", padding: 60, color: "#6B7280" },
  forbidden:    { textAlign: "center", padding: 80 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(10,46,110,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 },
  dialog:       { background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 340, width: "90%" },
};