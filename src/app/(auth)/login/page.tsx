"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { account } from "@/lib/appwrite/client";

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<"password" | "magic-link">("password");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    // If a session already exists, skip login page
    account
      .get()
      .then(() => {
        window.location.href = "/dashboard";
      })
      .catch(() => {
        // No active session, stay on login page
      });
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Clear any conflicting active session first
      try {
        await account.deleteSession("current");
      } catch (_) {}
      
      // Create session in Appwrite
      await account.createEmailPasswordSession(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      // 1. Verify user exists in the clients database first
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send magic link.");
      }

      // 2. Trigger magic URL token client-side
      const redirectUrl = window.location.origin + "/verify-magic-link";
      // This will send to the existing user if they exist or create a new one.
      // Since we checked they exist in client DB, we can safe-create a unique token.
      await account.createMagicURLToken("unique()", email, redirectUrl);

      setMagicLinkSent(true);
    } catch (err: any) {
      console.error("Magic link failed:", err);
      setError(err.message || "Something went wrong sending magic link.");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--foreground-2)",
    marginBottom: 6,
    fontFamily: "var(--font-body)",
  };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      {/* ─── Logo ─── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_light.svg" alt="Appibrium" style={{ height: 32, width: "auto" }} />
          <div style={{ width: 1, height: 22, background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
            Studio
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 4, textAlign: "center" }}>
          Sign in to your workspace
        </p>
      </div>

      {/* ─── Card ─── */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "28px 28px", boxShadow: "var(--shadow-md)" }}>
        {magicLinkSent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CheckCircle2 size={40} style={{ color: "#00965C", marginBottom: 16, marginInline: "auto" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)", marginBottom: 8 }}>Magic Link Sent</h2>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              Please check your inbox at <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Click the magic url to complete your login.
            </p>
            <button className="btn btn-ghost" onClick={() => setMagicLinkSent(false)} style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              Back
            </button>
          </div>
        ) : (
          <div>
            {/* Method Tabs */}
            <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 3, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => { setLoginMethod("password"); setError(""); }}
                style={{ flex: 1, border: "none", background: loginMethod === "password" ? "var(--background-alt)" : "none", color: loginMethod === "password" ? "var(--foreground)" : "var(--foreground-muted)", fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all 0.1s" }}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod("magic-link"); setError(""); }}
                style={{ flex: 1, border: "none", background: loginMethod === "magic-link" ? "var(--background-alt)" : "none", color: loginMethod === "magic-link" ? "var(--foreground)" : "var(--foreground-muted)", fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: "var(--radius-sm)", cursor: "pointer", transition: "all 0.1s" }}
              >
                Client Magic Link
              </button>
            </div>

            {loginMethod === "password" ? (
              <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label htmlFor="login-email" style={labelStyle}>Email address</label>
                  <input id="login-email" type="email" className="input-base" placeholder="you@appibrium.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label htmlFor="login-password" style={labelStyle}>Password</label>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input id="login-password" type={showPassword ? "text" : "password"} className="input-base" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 2 }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {error && <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F" }}>{error}</div>}
                <button id="login-submit" type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13, marginTop: 4 }}>
                  {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</> : <>Sign in <ArrowRight size={14} /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLinkSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label htmlFor="login-email-magic" style={labelStyle}>Email address</label>
                  <input id="login-email-magic" type="email" className="input-base" placeholder="client@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                {error && <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F" }}>{error}</div>}
                <button id="magic-login-submit" type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13, marginTop: 4 }}>
                  {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending Magic Link...</> : <>Send Magic Link <ArrowRight size={14} /></>}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: "center", marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>New Client? </span>
          <Link href="/register" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Register here
          </Link>
        </div>
        <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>
          © {new Date().getFullYear()} Appibrium Technology Co.{" "}
          <a href="https://appibrium.com" style={{ color: "var(--accent)", textDecoration: "none" }}>appibrium.com</a>
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
