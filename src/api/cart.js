import { API_BASE, apiFetch } from "./config";

export async function fetchCart(onExpired) {
    const res = await apiFetch(`${API_BASE}/cart/`, {}, onExpired);
    if (!res) return null;
    return res.json();
}

export async function addToCart(product_id, quantity, onExpired) {
    const res = await apiFetch(`${API_BASE}/cart/`, {
        method: "POST",
        body: JSON.stringify({ product_id, quantity }),
    }, onExpired);
    if (!res) return null;
    return res.json();
}

export async function updateCartItem(cart_id, quantity, onExpired) {
    const res = await apiFetch(`${API_BASE}/cart/${cart_id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
    }, onExpired);
    if (!res) return null;
    return res.json();
}

export async function removeCartItem(cart_id, onExpired) {
    const res = await apiFetch(`${API_BASE}/cart/${cart_id}`, {
        method: "DELETE",
    }, onExpired);
    if (!res) return null;
    return res.json();
}

export async function clearCart(onExpired) {
    const res = await apiFetch(`${API_BASE}/cart/clear`, {
        method: "DELETE",
    }, onExpired);
    if (!res) return null;
    return res.json();
}