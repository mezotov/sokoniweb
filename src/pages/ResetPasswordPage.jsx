import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { T } from "../styles/theme";
import { API_BASE } from "../api/config";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage({ setUser }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const email = searchParams.get("email") || "";
    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleReset(e) {
        e.preventDefault();
        if (loading) return; // prevent double submit
        setLoading(true);
        setError("");

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            setError("Password must contain at least one uppercase letter");
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            setError("Password must contain at least one number");
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            setError("Password must contain at least one special character");
            return;
        }
        if (newPassword !== confirm) {
            setError("Passwords don't match");
            return;
        }

        try {
            //step 1 - reset password
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, new_password: newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Reset failed");
                return;
            }
            // Step 2 — sign in automatically
            const signinRes = await fetch(`${API_BASE}/auth/signin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: newPassword }),
            });
            const signinData = await signinRes.json();

            if (!signinRes.ok) {
                // reset worked but auto-signin failed — send them home to sign in manually
                setMessage("Password reset! Please sign in.");
                setTimeout(() => navigate("/"), 2000);
                return;
            }

            // Step 3 — save token and redirect to dashboard
            localStorage.setItem("sokoni_token", signinData.token);
            setUser(signinData.user); // sets user in App.jsx and triggers navigate("/dashboard") automatically
            setMessage("Password reset successfully!");
        } catch {
            setError("Network error. Try again.");
        } finally {
        setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: T.offWhite,
            padding: 16,
        }}>
            <div style={{
                background: T.white,
                borderRadius: 20,
                padding: "40px 32px",
                width: "100%",
                maxWidth: 440,
                boxShadow: "0 24px 80px rgba(10,46,110,0.22)",
            }}>
                <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    color: T.yellow,
                    marginBottom: 4,
                }}>
                    SOKONI<span style={{ color: T.blue }}>B2B</span>
                </div>
                <h3 style={{
                    color: T.blue,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 6,
                    marginTop: 24,
                }}>
                    Set New Password
                </h3>
                <p style={{ color: T.gray500, fontSize: 13, marginBottom: 24 }}>
                    Enter a new password for <strong>{email}</strong>
                </p>

                {message ? (
                    <div style={{ color: T.success, fontWeight: 600, textAlign: "center" }}>
                        {message} Redirecting...
                    </div>
                ) : (
                    <form onSubmit={handleReset}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Min 8 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ paddingRight: 40 }}
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
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div style={{ position: "relative", width: "100%" }}>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Repeat password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    style={{ paddingRight: 40 }}
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
                        {error && (
                            <div className="form-error" style={{ marginBottom: 12 }}>
                                {error}
                            </div>
                        )}
                        <button type="submit" className="btn-full" disabled={loading}>
                            {loading ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    <span style={{
                                        width: 16,
                                        height: 16,
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTop: "2px solid white",
                                        borderRadius: "50%",
                                        display: "inline-block",
                                        animation: "spin 0.7s linear infinite",
                                        flexShrink: 0,
                                    }} />
                                    Resetting...
                                </span>
                            ) : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}