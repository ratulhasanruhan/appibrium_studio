"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { account } from "@/lib/appwrite/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Clear any conflicting active session first
      try {
        await account.deleteSession("current");
      } catch (_) {
        // No active session existed
      }
      
      // Create session in Appwrite
      await account.createEmailPasswordSession(email, password);
      // Force redirect
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>

      {/* ─── Logo ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <img
            src="/branding_assets/logos/lockup/lockup_w4_light.svg"
            alt="Appibrium"
            style={{ height: 22, width: "auto" }}
          />
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            Studio
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 4, textAlign: "center" }}>
          Sign in to your workspace
        </p>
      </div>

      {/* ─── Card ─── */}
      <div
        style={{
          background: "var(--background-alt)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 28px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground-2)",
                marginBottom: 6,
                fontFamily: "var(--font-body)",
              }}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="input-base"
              placeholder="you@appibrium.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label
                htmlFor="login-password"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--foreground-2)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--foreground-faint)",
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "#FEF2F2",
                border: "1px solid #FAC5C5",
                fontSize: 12,
                color: "#D14F4F",
                fontFamily: "var(--font-body)",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13, marginTop: 4 }}
          >
            {loading ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</>
            ) : (
              <>Sign in <ArrowRight size={14} /></>
            )}
          </button>

        </form>
      </div>

      {/* ─── Footer ─── */}
      <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--foreground-muted)" }}>
        © {new Date().getFullYear()} Appibrium Technology Co.{" "}
        <a href="https://appibrium.com" style={{ color: "var(--accent)", textDecoration: "none" }}>
          appibrium.com
        </a>
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
