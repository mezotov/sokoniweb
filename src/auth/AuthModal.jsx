import { API_BASE } from "../api/config";
import { useState, useEffect } from "react";
import { T } from "../styles/theme";
import { Eye, EyeOff } from "lucide-react";

export default function AuthModal({ setUser, setModalOpen, showToast }) {
	const [tab, setTab] = useState("login");
	const [step, setStep] = useState("form"); // form | otp | success
	const [form, setForm] = useState({
		username: "",
		email: "",
		phone: "",
		password: "",
		confirm: "",
		role: "retailer",
		business_name: "", // only matters if supplier
	});
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [errors, setErrors] = useState({});
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	
	function set(k, v) {
		setForm((f) => ({ ...f, [k]: v }));
	}

	function validateSignup() {
		const e = {};
		if (!form.username.trim()) e.username = "Username required";
		if (!form.email.includes("@")) e.email = "Valid email required";
		if (!form.phone.match(/^\+?[\d\s]{9,}$/)) e.phone = "Valid phone required";

		// Match backend validate_password exactly
		if (form.password.length < 8) {
			e.password = "Password must be at least 8 characters";
		} else if (!/[A-Z]/.test(form.password)) {
			e.password = "Password must contain at least one uppercase letter";
		} else if (!/[0-9]/.test(form.password)) {
			e.password = "Password must contain at least one number";
		} else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
			e.password = "Password must contain at least one special character";
		}

		if (form.password !== form.confirm) e.confirm = "Passwords don't match";
		if (form.role === "supplier" && !form.business_name.trim()) {
        e.business_name = "Business name is required for suppliers";
    	}
		setErrors(e);
		return Object.keys(e).length === 0;
}
// Prevent page reload, run validation, and if it passes move to the OTP step
	async function handleSignup(e) {
    	e.preventDefault();
		if (!validateSignup()) return;
		setLoading(true); //lock the button
		try {
			const res = await fetch(`${API_BASE}/auth/signup`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: form.username,
					email:    form.email,
					phone:    form.phone,
					password: form.password,
					role:     form.role,
					business_name: form.business_name, // only matters if supplier
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				showToast(data.error || "Signup failed", "error");
				return;
			}
			showToast(
            form.role === "supplier"
                ? "Check your email, then wait for admin approval."
                : "Check your email for the activation code!",
            "success"
        );
        setStep("otp");
		} catch {
			showToast("Network error. Try again.", "error");
		}
		finally {
       	 	setLoading(false);
    	}
	}

// handle activate/verify0tp
	async function verifyOtp() {
		if (loading) return; //prevent double submit
		const code = otp.join("").trim();

		if (code.length < 6) {
			showToast("Enter the full 6-digit code.", "error");
			return;
		}
		setLoading(true); //lock the button
		try {
			const res = await fetch(`${API_BASE}/auth/activate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: form.email,
					code:  code,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				showToast(data.error || "Activation failed", "error");
				return;
			}
			setStep("success");
			setUser({ email: form.email, username: form.username, role: form.role }); // log them in
		} catch {
			showToast("Network error. Try again.", "error");
		}
		finally {
        	setLoading(false);
    	}
	}
//Resend code
	async function handleResend() {
		try {
			const res = await fetch(`${API_BASE}/auth/resend-code`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: form.email }),
			});
			const data = await res.json();
			showToast(
				data.email_sent
					? "New code sent! Check your inbox."
					: "Could not send email. Try again.",
				data.email_sent ? "success" : "error"
			);
		} catch {
			showToast("Network error. Try again.", "error");
		}
	}
	useEffect(() => {
		if (step === "success") {
			const timer = setTimeout(() => {
				setModalOpen(false);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [step]);

// validate login form and if it passes, set the user and close the modal
	async function handleLogin(e) {
    e.preventDefault();

    if (!form.email.trim()) {
        setErrors({ email: "Email is required" });
        return;
    }
    if (!form.password) {
        setErrors({ password: "Password is required" });
        return;
    }
    setLoading(true);
    try {
        const res = await fetch(`${API_BASE}/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email:    form.email,
                password: form.password,
            }),
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || "Sign in failed", "error");
            return;
        }

        localStorage.setItem("sokoni_token", data.token);
        setUser(data.user);
        setModalOpen(false);
        showToast(`Welcome back, ${data.user.username}! 👋`, "success");

    } catch {
        showToast("Network error. Try again.", "error");
    } finally {
        setLoading(false);
    }
}
	// forgot password
	async function handleForgotPassword(e) {
		e.preventDefault();
		if (loading) return; //prevent double submit

		if (!form.email.trim()) {
			setErrors({ email: "Email is required" });
			return;
		}
		setLoading(true); //lock the button
		try {
			const res = await fetch(`${API_BASE}/auth/forgot-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: form.email }),
			});
			const data = await res.json();
			showToast("Check your email for a reset link!", "success"); 
			setStep("form"); //go back to login form after sending reset link
		} catch {
			showToast("Network error. Try again.", "error");
		} finally {
        	setLoading(false); //  unlock
    	}
	}

	function handleOtpChange(idx, val) {
		if (val.length > 1) val = val.slice(-1);
		const next = [...otp];
		next[idx] = val;
		setOtp(next);
		if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
	}


	return (
		<div
			className="overlay"
			onClick={(e) => {
				if (e.target.classList.contains("overlay")) setModalOpen(false);
			}}
		>
			<div className="modal">
				<div className="modal-header modal-header-wrap">
					<button
						className="modal-close"
						onClick={() => setModalOpen(false)}
					>
						✕
					</button>
					<div className="modal-logo">
						SOKONI<span>B2B</span>
					</div>
					<div className="modal-tagline">
						East Africa's B2B Wholesale Platform
					</div>
				</div>

				<div className="modal-body">
					{step === "success" ? (
						<div style={{ textAlign: "center", padding: "20px 0" }}>
							<div className="success-icon">✓</div>
							<h3
								style={{
									color: T.blue,
									fontFamily:
										"'Plus Jakarta Sans', sans-serif",
									fontSize: 20,
									fontWeight: 800,
									marginBottom: 8,
								}}
							>
								Account Verified!
							</h3>
							<p style={{ color: T.gray500, fontSize: 14 }}>
								Setting up your account...
							</p>
						</div>
					) : step === "otp" ? (
						<>
							<div
								style={{
									textAlign: "center",
									marginBottom: 20,
								}}
							>
								<div style={{ fontSize: 40, marginBottom: 12 }}>
									📧
								</div>
								<h3
									style={{
										color: T.blue,
										fontFamily:
											"'Plus Jakarta Sans', sans-serif",
										fontSize: 18,
										fontWeight: 800,
										marginBottom: 6,
									}}
								>
									Check Your Email
								</h3>
								<p
									style={{
										color: T.gray500,
										fontSize: 13,
										lineHeight: 1.6,
									}}
								>
									We sent a 6-digit activation code to
									<br />
									<strong style={{ color: T.blue }}>
										{form.email}
									</strong>
								</p>
							</div>
							<div className="otp-row">
								{otp.map((v, i) => (
									<input
										key={i}
										id={`otp-${i}`}
										className="otp-input"
										maxLength={2}
										value={v}
										onChange={(e) =>
											handleOtpChange(i, e.target.value)
										}
										onKeyDown={(e) => {
											if (
												e.key === "Backspace" &&
												!v &&
												i > 0
											)
												document
													.getElementById(
														`otp-${i - 1}`,
													)
													?.focus();
										}}
									/>
								))}
							</div>
							<button className="btn-full yellow" onClick={verifyOtp} disabled={loading}>
								{loading ? (
									<span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
										<span className="spinner spinner-dark" /> Verifying...
									</span>
								) : "Verify & Activate Account"}
							</button>
							<p
								style={{
									textAlign: "center",
									fontSize: 13,
									color: T.gray500,
									marginTop: 14,
								}}
							>
								Didn't get it?{" "}
								<span
									style={{
										color: T.blueLight,
										fontWeight: 600,
										cursor: "pointer",
									}}
									
									onClick={handleResend}
								>
									Resend code
								</span>
							</p>
						</>
					) : step === "forgot" ?  (
						<>
							<div style={{ marginBottom: 20 }}>
								<h3 style={{
									color: T.blue,
									fontFamily: "'Plus Jakarta Sans', sans-serif",
									fontSize: 18,
									fontWeight: 800,
									marginBottom: 6,
								}}>
									Reset Password
								</h3>
								<p style={{ color: T.gray500, fontSize: 13 }}>
									Enter your email and we'll send you a reset link.
								</p>
							</div>
							<form onSubmit={handleForgotPassword}>
								<div className="form-group">
									<label className="form-label">Email</label>
									<input
										type="email"
										className={`form-input ${errors.email ? "error" : ""}`}
										placeholder="you@business.co.ke"
										value={form.email}
										onChange={(e) => set("email", e.target.value)}
									/>
									{errors.email && (
										<div className="form-error">{errors.email}</div>
									)}
								</div>
								<button type="submit" className="btn-full" disabled={loading}>
									{loading ? "Sending..." : "Send Reset Link"}
								</button>
								<p
									style={{
										textAlign: "center",
										fontSize: 13,
										color: T.blueLight,
										fontWeight: 600,
										cursor: "pointer",
										marginTop: 16,
									}}
									onClick={() => setStep("form")}
								>
									← Back to Sign In
								</p>
							</form>
						</>
					) : (
						<>
							<div className="modal-tabs">
								<div
									className={`modal-tab ${tab === "login" ? "active" : ""}`}
									onClick={() => {
										setTab("login");
										setErrors({});
									}}
								>
									Sign In
								</div>
								<div
									className={`modal-tab ${tab === "signup" ? "active" : ""}`}
									onClick={() => {
										setTab("signup");
										setErrors({});
									}}
								>
									Create Account
								</div>
							</div>
							{/* //signin form */}
							{tab === "login" ? (
								<form onSubmit={handleLogin}>
									<div className="form-group">
										<label className="form-label">Email</label>
										<input
											type="email"
											className={`form-input ${errors.email ? "error" : ""}`}
											placeholder="you@business.co.ke"
											value={form.email}
											onChange={(e) => set("email", e.target.value)}
										/>
										{errors.email && (
											<div className="form-error">{errors.email}</div>
										)}
									</div>
									<div className="form-group">
										<label className="form-label">Password</label>
										<div style={{ position: "relative" }}>
											<input
												type={showPassword ? "text" : "password"}
												className={`form-input ${errors.password ? "error" : ""}`}
												placeholder="••••••••"
												value={form.password}
												onChange={(e) => set("password", e.target.value)}
											/>
											<span
												onClick={() => setShowPassword(!showPassword)}
												style={{
													position: "absolute",
													right: 12,
													top: "50%",
													transform: "translateY(-50%)",
													cursor: "pointer",
													color: T.gray500,
													display: "flex",
													alignItems: "center",
												}}
											>
												{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
											</span>
										</div>
										{errors.password && (
											<div className="form-error">{errors.password}</div>
										)}
									</div>
									<p
										style={{
											textAlign: "right",
											fontSize: 12,
											color: T.blueLight,
											fontWeight: 600,
											cursor: "pointer",
											marginBottom: 16,
											marginTop: -8,
										}}
										onClick={() => setStep("forgot")}
									>
										Forgot password?
									</p>
									<button type="submit" className="btn-full" disabled={loading}>
										{loading ? (
											<span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
												<span className="spinner" /> Signing in...
											</span>
										) : "Sign In to My Account"}
									</button>
									<div className="divider">
										<hr />
										<span>or</span>
										<hr />
									</div>
									<p
										style={{
											textAlign: "center",
											fontSize: 13,
											color: T.gray500,
										}}
									>
										New to Sokoni?{" "}
										<span
											style={{
												color: T.blueLight,
												fontWeight: 700,
												cursor: "pointer",
											}}
											onClick={() => setTab("signup")}
										>
											Create an account →
										</span>
									</p>
								</form>

								// signup form
							) : (
								<form onSubmit={handleSignup}>
									<div className="form-group">
										<label className="form-label">
											Username
										</label>
										<input
											className={`form-input ${errors.username ? "error" : ""}`}
											placeholder="business_username"
											value={form.username}
											onChange={(e) =>
												set("username", e.target.value)
											}
										/>
										{errors.username && (
											<div className="form-error">
												{errors.username}
											</div>
										)}
									</div>
									<div className="form-group">
										<label className="form-label">
											Business Email
										</label>
										<input
											type="email"
											className={`form-input ${errors.email ? "error" : ""}`}
											placeholder="you@business.co.ke"
											value={form.email}
											onChange={(e) =>
												set("email", e.target.value)
											}
										/>
										{errors.email && (
											<div className="form-error">
												{errors.email}
											</div>
										)}
										<div className="form-hint">
											Your activation code will be sent
											here
										</div>
									</div>
									<div className="form-group">
										<label className="form-label">
											Phone Number
										</label>
										<input
											className={`form-input ${errors.phone ? "error" : ""}`}
											placeholder="+254 700 000 000"
											value={form.phone}
											onChange={(e) =>
												set("phone", e.target.value)
											}
										/>
										{errors.phone && (
											<div className="form-error">
												{errors.phone}
											</div>
										)}
									</div>
									<div className="form-group">
										<label className="form-label">
											Password
										</label>
										<div style={{ position: "relative" }}>
											<input
												type={showPassword ? "text" : "password"}
												className={`form-input ${errors.password ? "error" : ""}`}
												placeholder="Min 8 characters"
												value={form.password}
											onChange={(e) =>
												set("password", e.target.value)
											}
											/>
											<span
												onClick={() => setShowPassword(!showPassword)}
												style={{
													position: "absolute",
													right: 12,
													top: "50%",
													transform: "translateY(-50%)",
													cursor: "pointer",
													color: T.gray500,
													display: "flex",
													alignItems: "center",
												}}
											>
												{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
											</span>
											{errors.password && (
												<div className="form-error">
													{errors.password}
												</div>
											)}
										</div>
									</div>
									<div className="form-group">
										<label className="form-label">
											Confirm Password
										</label>
										<div style={{ position: "relative" }}>
											<input
												type={showConfirm ? "text" : "password"}
												className={`form-input ${errors.confirm ? "error" : ""}`}
												placeholder="Repeat password"
												value={form.confirm}
												onChange={(e) =>
												set("confirm", e.target.value)
												}
											/>
											<span
												onClick={() => setShowConfirm(!showConfirm)}
												style={{
													position: "absolute",
													right: 12,
													top: "50%",
													transform: "translateY(-50%)",
													cursor: "pointer",
													color: T.gray500,
													display: "flex",
													alignItems: "center",
												}}
											>
												{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
											</span>
										</div>
									</div>
									<div className="role-toggle">
										<button
											type="button"
											className={form.role === "retailer" ? "active" : ""}
											onClick={() => set("role", "retailer")}
										>
											Retailer
										</button>
										<button
											type="button"
											className={form.role === "supplier" ? "active" : ""}
											onClick={() => set("role", "supplier")}
										>
											Supplier
										</button>
									</div>
									{form.role === "supplier" && (
										<div className="form-group">
											<label className="form-label">Business Name</label>
											<input
												className={`form-input ${errors.business_name ? "error" : ""}`}
												placeholder="e.g. Kamau Wholesalers Ltd"
												value={form.business_name}
												onChange={(e) => set("business_name", e.target.value)}
											/>
											{errors.business_name && (
												<div className="form-error">{errors.business_name}</div>
											)}
											<div className="form-hint">
												Suppliers require admin approval before ordering
											</div>
										</div>
									)}
									<button type="submit" className="btn-full yellow" disabled={loading}>
										{loading ? (
											<span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
												<span className="spinner spinner-dark" /> Creating account...
											</span>
										) : "Create Account & Get Code"}
									</button>
									<p
										style={{
											textAlign: "center",
											fontSize: 11,
											color: T.gray500,
											marginTop: 12,
											lineHeight: 1.6,
										}}
									>
										By signing up you agree to Sokoni's{" "}
										<span
											style={{
												color: T.blueLight,
												cursor: "pointer",
											}}
										>
											Terms of Service
										</span>{" "}
										and{" "}
										<span
											style={{
												color: T.blueLight,
												cursor: "pointer",
											}}
										>
											Privacy Policy
										</span>
									</p>
								</form>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
