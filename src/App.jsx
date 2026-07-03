import { API_BASE } from "./api/config";
import { useState, useEffect } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	useNavigate,
	useLocation,
} from "react-router-dom";

import { css } from "./styles/globalStyles";

import Navbar from "./components/Navbar";
import CategoryBar from "./components/CategoryBar";
import CartSidebar from "./components/CartSidebar";
import Toast from "./components/Toast";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import DashboardPage from "./pages/DashboardPage";
import AuthModal from "./auth/AuthModal";
import AdminPage from "./pages/AdminPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// ─── INNER APP (has access to router hooks) ───────────────────────────────────
function InnerApp() {
	const navigate = useNavigate();
	const location = useLocation();

	const [user, setUser] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [cartOpen, setCartOpen] = useState(false);
	const [cart, setCart] = useState([]);
	const [toast, setToast] = useState(null);
	const [activeCat, setActiveCat] = useState("all");
	const [authChecked, setAuthChecked] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);

	const [categories, setCategories] = useState([]);

	function showToast(msg, type = "success") {
		setToast({ msg, type });
		setTimeout(() => setToast(null), 3200);
	}

	// If user logs out while on dashboard, redirect home
	useEffect(() => {
		if (authChecked && !user && location.pathname === "/dashboard") {
			navigate("/");
			setModalOpen(true);
		}
	}, [user, location.pathname, authChecked]);

	useEffect(() => {
		const token = localStorage.getItem("sokoni_token");
		if (!token) {
			setAuthChecked(true);
			return;
		}

		fetch(`${API_BASE}/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(res => res.ok ? res.json() : Promise.reject())
			.then(data => setUser(data.user))
			.catch(() => {
				localStorage.removeItem("sokoni_token");
			})
			.finally(() => setAuthChecked(true));
	}, []);

	useEffect(() => {
		fetchCategories().then(data => {
			if (data) setCategories([
				{ category_id: "all", name: "All", slug: "all" },
				...data.categories,
			]);
		});
	}, []);

	function handleSetUser(u) {
    // console.log("handleSetUser called with:", u);
    setUser(u);
    if (!u) { navigate("/"); return; }
    if (u.role === "admin") navigate("/admin");
    else navigate("/dashboard");
}

	function handleCatClick(cat) {
		setActiveCat(cat);
		navigate("/"); // always go home when a category is picked
	}

	function handleSessionExpired() {
		setUser(null);
		navigate("/");
		setModalOpen(true);
		showToast("Your session has expired. Please sign in again.", "warn");
	}
	async function handleLogout() {
		setLoggingOut(true);
		const token = localStorage.getItem("sokoni_token");
		try {
			await fetch(`${API_BASE}/auth/logout`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
		} catch {
			// ignore network errors, still log out locally
		}
		localStorage.removeItem("sokoni_token");
		setUser(null);
		navigate("/");
		showToast("Signed out successfully", "success");
		setLoggingOut(false);
	}
	return (
		<>
			{/* Inject all global CSS into the page */}
			<style>{css}</style>

			<Navbar
				activePath={location.pathname}
				onNav={navigate}
				setModalOpen={setModalOpen}
				cartCount={cart.length}
				setCartOpen={setCartOpen}
				user={user}
				setUser={handleSetUser}
				authChecked={authChecked}
				onLogout={handleLogout}
				loggingOut={loggingOut}
			/>

			{!location.pathname.startsWith("/admin") && (
				<CategoryBar activeCat={activeCat} setActiveCat={handleCatClick} categories={categories}/>
			)}

			<Routes>
				<Route
					path="/"
					element={
						<HomePage
							user={user}
							setModalOpen={setModalOpen}
							cart={cart}
							setCart={setCart}
							showToast={showToast}
							activeCat={activeCat}
							setActiveCat={handleCatClick}
						/>
					}
				/>
				<Route
					path="/products"
					element={
						<ProductsPage
							user={user}
							cart={cart}
							setCart={setCart}
							showToast={showToast}
							setModalOpen={setModalOpen}
						/>
					}
				/>
				<Route
					path="/dashboard"
					element={
						!authChecked ? (
							<div style={{ textAlign: "center", padding: 80, color: "#0A2E6E" }}>
								Loading...
							</div>
						) : user ? (
							<DashboardPage user={user} />
						) : null
					}
				/>
				<Route
					path="/admin"
					element={
						!authChecked ? (
							<div style={{ textAlign: "center", padding: 80, color: "#0A2E6E" }}>
								Loading...
							</div>
						) : user?.role === "admin" ? (
							<AdminPage user={user} showToast={showToast} />
						) : null
					}
				/>
				<Route
    				path="/reset-password"
    				element={<ResetPasswordPage setUser={handleSetUser} />}
				/>

			</Routes>

			<Footer />

			{modalOpen && (
				<AuthModal
					setUser={handleSetUser}
					setModalOpen={setModalOpen}
					showToast={showToast}
				/>
			)}

			{/* Cart overlay backdrop */}
			{cartOpen && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(10,46,110,0.4)",
						zIndex: 290,
						backdropFilter: "blur(2px)",
					}}
					onClick={() => setCartOpen(false)}
				/>
			)}

			<CartSidebar
				open={cartOpen}
				setOpen={setCartOpen}
				cart={cart}
				setCart={setCart}
				showToast={showToast}
			/>

			<Toast toast={toast} />
		</>
	);
}

//  ROOT APP — wraps everything in BrowserRouter 
export default function App() {
	return (
		<BrowserRouter>
			<InnerApp />
		</BrowserRouter>
	);
}
