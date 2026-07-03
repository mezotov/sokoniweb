import { API_BASE, apiFetch } from "./config";

export async function fetchProducts({ search = "", category_id = "", page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category_id) params.append("category_id", category_id);
    params.append("page", page);
    params.append("limit", limit);

    const res = await fetch(`${API_BASE}/products/?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
}

export async function fetchProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error("Product not found");
    return res.json();
}

export async function fetchCategories() {
    const res = await fetch(`${API_BASE}/categories/`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
}