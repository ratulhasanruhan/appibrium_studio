"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { ClientsTable } from "@/modules/crm/clients-table";
import type { Metadata } from "next";
import { Plus, X, Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/services/crm";

export default function CRMPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState<"idle" | "saved" | "error">("idle");
  const [error,     setError]     = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Form fields
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [cStatus, setCStatus] = useState<"lead" | "active">("lead");

  function openModal() {
    setName(""); setEmail(""); setPhone(""); setWebsite(""); setAddress("");
    setCStatus("lead"); setStatus("idle"); setError("");
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      setError("Name and email are required.");
      setStatus("error");
      return;
    }
    setSaving(true);
    setError("");
    const result = await createClient({ name, email, phone, website, address, status: cStatus });
    setSaving(false);
    if (result.success) {
      setStatus("saved");
      setTimeout(() => {
        setShowModal(false);
        setRefreshKey((k) => k + 1); // triggers re-fetch in table
        setStatus("idle");
      }, 800);
    } else {
      setError(result.error || "Failed to create client.");
      setStatus("error");
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
    <>
      <Topbar
        title="CRM"
        subtitle="Manage leads, clients, and contacts"
        actions={
          <button id="add-client-btn" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={openModal}>
            <Plus size={13} /> New Client
          </button>
        }
      />
      <div className="page-content">
        <ClientsTable key={refreshKey} />
      </div>

      {/* ─── New Client Modal ─── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", padding: 24 }}>

            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>New Client</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginTop: 2 }}>Add a new client or lead to your CRM</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground-muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Status Toggle */}
              <div>
                <label style={labelStyle}>Client Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["lead", "active"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCStatus(s)}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${cStatus === s ? "var(--accent)" : "var(--border)"}`,
                        background: cStatus === s ? "var(--accent-subtle)" : "var(--surface)",
                        color: cStatus === s ? "var(--accent)" : "var(--foreground-muted)",
                        fontSize: 12, fontWeight: cStatus === s ? 600 : 400,
                        cursor: "pointer", textTransform: "capitalize",
                        fontFamily: "var(--font-body)",
                        transition: "all 0.12s",
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="new-client-name">Company / Client Name *</label>
                <input id="new-client-name" className="input-base" placeholder="e.g. TechFlow Inc." value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle} htmlFor="new-client-email">Email Address *</label>
                <input id="new-client-email" className="input-base" type="email" placeholder="hello@client.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="new-client-phone">Phone</label>
                  <input id="new-client-phone" className="input-base" placeholder="+8801..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="new-client-website">Website</label>
                  <input id="new-client-website" className="input-base" placeholder="https://client.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle} htmlFor="new-client-address">Address</label>
                <input id="new-client-address" className="input-base" placeholder="City, Country" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              {status === "error" && (
                <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ fontSize: 12, flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" id="create-client-submit" className="btn btn-primary" style={{ fontSize: 12, flex: 2, justifyContent: "center" }} disabled={saving}>
                  {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Creating...</> :
                   status === "saved" ? <><Check size={13} /> Created!</> :
                   <><Plus size={13} /> Create Client</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
