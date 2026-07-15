"use client";

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { account, ID } from "@/lib/appwrite/client";

export default function RegisterPage() {
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [website, setWebsite]         = useState("");
  const [address, setAddress]         = useState("");

  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState<"idle" | "sent" | "error">("idle");
  const [error, setError]             = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create client & contact records in DB
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, firstName, lastName, email, phone, website, address }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register.");
      }

      // 2. Trigger Appwrite Magic URL token send client-side
      const redirectUrl = window.location.origin + "/verify-magic-link";
      await account.createMagicURLToken(ID.unique(), email, redirectUrl);

      setStatus("sent");
    } catch (err: any) {
      console.error("Registration failed:", err);
      setStatus("error");
      setError(err.message || "Something went wrong during registration.");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--foreground-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div style={{ width: "100%", maxWidth: 460 }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_light.svg" alt="Appibrium" style={{ height: 30, width: "auto" }} />
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
            Studio
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 4, textAlign: "center" }}>
          Register as an Appibrium Studio Client
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "28px 28px", boxShadow: "var(--shadow-md)" }}>
        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CheckCircle2 size={40} style={{ color: "#00965C", marginBottom: 16, marginInline: "auto" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)", marginBottom: 8 }}>Check your inbox!</h2>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              We have sent a secure Magic URL to <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Click the link in that email to instantly sign in.
            </p>
            <Link href="/login" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle} htmlFor="reg-company">Company Name *</label>
              <input id="reg-company" className="input-base" placeholder="e.g. Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="reg-first">First Name *</label>
                <input id="reg-first" className="input-base" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle} htmlFor="reg-last">Last Name *</label>
                <input id="reg-last" className="input-base" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor="reg-email">Email Address *</label>
              <input id="reg-email" className="input-base" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="reg-phone">Phone</label>
                <input id="reg-phone" className="input-base" placeholder="+8801..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="reg-web">Website</label>
                <input id="reg-web" className="input-base" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor="reg-address">Address</label>
              <input id="reg-address" className="input-base" placeholder="City, Country" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {status === "error" && (
              <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button type="submit" id="register-submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13, marginTop: 4 }} disabled={loading}>
              {loading ? (
                <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Registering...</>
              ) : (
                <>Register & Send Magic Link <ArrowRight size={14} /></>
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Already registered? </span>
              <Link href="/login" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
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
