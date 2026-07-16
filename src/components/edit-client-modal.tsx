"use client";

import { useState } from "react";
import { updateClient } from "@/services/crm";
import { Loader2, Check, AlertCircle, Users } from "lucide-react";
import type { Client } from "@/types";

interface EditClientModalProps {
  client: Client;
  onUpdate: (updatedClient: Client) => void;
  onClose: () => void;
}

export function EditClientModal({ client, onUpdate, onClose }: EditClientModalProps) {
  const [name, setName] = useState(client.name || "");
  const [legalName, setLegalName] = useState(client.legal_name || "");
  const [email, setEmail] = useState(client.email || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [website, setWebsite] = useState(client.website || "");
  const [address, setAddress] = useState(client.address || "");
  const [status, setStatus] = useState<Client["status"]>(client.status || "lead");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Company Name and Email are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await updateClient(client.$id, {
        name: name.trim(),
        legal_name: legalName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        website: website.trim(),
        address: address.trim(),
        status,
      });

      if (res.success && res.data) {
        setSuccess(true);
        setTimeout(() => {
          onUpdate(res.data!);
        }, 1000);
      } else {
        setError(res.error || "Failed to update client profile.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while updating.");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--foreground-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 26, 16, 0.4)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "var(--background-alt)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "scale-in 0.15s ease forwards",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#E6FAF3",
                border: "1px solid #B3E8D2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Check size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Client Updated!</h2>
              <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 4 }}>
                The client profile has been updated successfully.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Users size={16} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>
                  Edit Client Profile
                </h2>
              </div>
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", lineHeight: 1.4 }}>
                Modify business details and CRM relationship status for this client.
              </p>
            </div>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "10px 12px", borderRadius: "var(--radius-md)", color: "#D14F4F", fontSize: 12 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="edit-company">Company Name *</label>
                  <input
                    id="edit-company"
                    className="input-base"
                    placeholder="e.g. Acme Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="edit-legal">Legal Name</label>
                  <input
                    id="edit-legal"
                    className="input-base"
                    placeholder="e.g. Acme Corp Ltd."
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="edit-email">Email Address *</label>
                  <input
                    id="edit-email"
                    type="email"
                    className="input-base"
                    placeholder="client@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="edit-status">Relationship Status</label>
                  <select
                    id="edit-status"
                    className="input-base"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="edit-phone">Phone Number</label>
                <input
                  id="edit-phone"
                  className="input-base"
                  placeholder="+880 1XXX XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="edit-website">Website URL</label>
                <input
                  id="edit-website"
                  className="input-base"
                  placeholder="company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="edit-address">Billing Address</label>
                <textarea
                  id="edit-address"
                  className="input-base"
                  placeholder="Street, City, Postcode, Country"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ resize: "none" }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={13} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
