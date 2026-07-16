"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Check, X, Trash2, Loader2, Eye, ClipboardList } from "lucide-react";
import type { Quote as Inquiry, Client } from "@/types";
import { formatRelativeTime } from "@/utils";
import Link from "next/link";
import { getInquiries, updateInquiryStatus, deleteInquiry, createInquiry } from "@/services/inquiries";
import { createProposal } from "@/services/proposals";
import { getClients } from "@/services/crm";
import { createNotification } from "@/services/notifications";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type InquiryWithClient = Inquiry & { client_name: string; client_email: string };

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge-planning",
  converted: "badge-accepted",
  declined:  "badge-rejected",
};

type StatusFilter = "all" | Inquiry["status"];
const FILTERS: StatusFilter[] = ["all", "pending", "converted", "declined"];

export function InquiriesList() {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<StatusFilter>("all");
  const [inquiries, setInquiries]   = useState<InquiryWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeInquiry, setActiveInquiry] = useState<InquiryWithClient | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // States for client submission modal
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [newService, setNewService] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newInquiryLoading, setNewInquiryLoading] = useState(false);
  const [clientDbId, setClientDbId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");

  async function loadData() {
    setLoading(true);
    try {
      const user = await account.get();
      const labels = (user as any).labels || [];
      const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
      setIsAdmin(admin);

      let rawInquiries: Inquiry[] = [];
      let clients: Client[] = [];

      if (!admin) {
        // Logged-in customer gets their matching client ID
        const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
          Query.equal("email", user.email),
          Query.limit(1)
        ]);
        if (clientRes.documents.length > 0) {
          const matchedClient = clientRes.documents[0] as unknown as Client;
          setClientDbId(matchedClient.$id);
          setClientName(matchedClient.name);
          rawInquiries = await getInquiries(matchedClient.$id);
          clients = [matchedClient];
        }
      } else {
        // Admin gets all inquiries
        const [allInquiries, allClis] = await Promise.all([
          getInquiries(),
          getClients(),
        ]);
        rawInquiries = allInquiries;
        clients = allClis;
      }

      const clientMap = new Map<string, { name: string; email: string }>(
        clients.map((c) => [c.$id, { name: c.name, email: c.email }])
      );

      const enriched: InquiryWithClient[] = rawInquiries.map((q) => {
        const cli = clientMap.get(q.client_id);
        return {
          ...q,
          client_name: cli?.name ?? "Unknown Lead",
          client_email: cli?.email ?? "N/A",
        };
      });

      setInquiries(enriched);
    } catch (err) {
      console.error("[InquiriesList] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleConvert(inquiry: InquiryWithClient) {
    if (!confirm(`Convert inquiry request for "${inquiry.service}" into a draft proposal?`)) return;
    setActionLoading(true);
    try {
      const publicToken = "tok_" + Math.random().toString(36).substring(2, 10);
      const draftContent = `
        <h2>1. Inquiry Executive Summary</h2>
        <p>Requested by <strong>${inquiry.client_name}</strong> for <strong>${inquiry.service}</strong>.</p>
        <p><strong>Original Request Details:</strong></p>
        <div style="padding: 12px; background: #F3FBF7; border-left: 4px solid #00B872; margin: 10px 0; border-radius: var(--radius-sm);">
          ${inquiry.message.replace(/\n/g, "<br />")}
        </div>
        <h2>2. Proposed Architecture & Scope</h2>
        <p>[Admin, edit this text to add architecture details and estimated pricing...]</p>
      `;

      const proposalResult = await createProposal({
        client_id: inquiry.client_id,
        title: `${inquiry.service} Proposal`,
        status: "draft",
        content_html: draftContent.trim(),
        public_token: publicToken,
        version: 1,
        currency: "BDT",
      });

      if (proposalResult.success && proposalResult.data) {
        const proposalId = proposalResult.data.$id;
        const updateResult = await updateInquiryStatus(inquiry.$id, "converted", proposalId);
        
        if (updateResult.success) {
          setActiveInquiry(null);
          window.location.href = `/proposals/${proposalId}/edit`;
        } else {
          alert("Failed to update inquiry status: " + updateResult.error);
        }
      } else {
        alert("Failed to create proposal: " + proposalResult.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline(id: string) {
    if (!confirm("Are you sure you want to decline this inquiry request?")) return;
    const res = await updateInquiryStatus(id, "declined");
    if (res.success) {
      setInquiries(prev => prev.map(q => q.$id === id ? { ...q, status: "declined" as const } : q));
      setActiveInquiry(null);
    } else {
      alert("Failed to decline inquiry: " + res.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this inquiry request?")) return;
    const res = await deleteInquiry(id);
    if (res.success) {
      setInquiries(prev => prev.filter(q => q.$id !== id));
      setActiveInquiry(null);
    } else {
      alert("Failed to delete inquiry: " + res.error);
    }
  }

  async function handleCreateInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!clientDbId) {
      alert("Error: Logged-in client profile not found. Please contact support.");
      return;
    }
    setNewInquiryLoading(true);
    try {
      const createRes = await createInquiry({
        client_id: clientDbId,
        service: newService,
        message: newMessage,
        status: "pending"
      });

      if (createRes.success && createRes.data) {
        // Create notification for admin
        await createNotification({
          user_id: "admin",
          title: "New Inquiry Submitted",
          message: `${clientName || "A logged-in client"} has submitted an inquiry for "${newService}".`,
          type: "project_updated",
          is_read: false,
          link: "/inquiries"
        });

        // Reset form & close modal
        setNewService("");
        setNewMessage("");
        setIsNewInquiryOpen(false);

        // Reload data
        await loadData();
      } else {
        alert("Failed to submit inquiry: " + createRes.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setNewInquiryLoading(false);
    }
  }

  const filtered = inquiries.filter((q) => {
    const searchVal = search.toLowerCase();
    const matchSearch =
      q.service.toLowerCase().includes(searchVal) ||
      q.client_name.toLowerCase().includes(searchVal) ||
      q.client_email.toLowerCase().includes(searchVal) ||
      q.message.toLowerCase().includes(searchVal);

    const matchFilter = filter === "all" || q.status === filter;
    return matchSearch && matchFilter;
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    color: "var(--foreground-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input id="inquiry-search" className="input-base" placeholder="Search inquiries..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((s) => (
            <button
              key={s}
              id={`inquiry-filter-${s}`}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                fontFamily: "var(--font-body)",
                fontWeight: filter === s ? 600 : 400,
                cursor: "pointer",
                background: filter === s ? "var(--accent-subtle)" : "var(--background-alt)",
                color: filter === s ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${filter === s ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
                transition: "all 0.1s",
                textTransform: "capitalize",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
            {loading ? "Loading..." : `${filtered.length} request${filtered.length !== 1 ? "s" : ""}`}
          </span>
          {!isAdmin && !loading && clientDbId && (
            <button
              onClick={() => setIsNewInquiryOpen(true)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#FFFFFF",
                background: "var(--accent)",
                border: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s"
              }}
            >
              + New Inquiry
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading inquiries...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Area</th>
                <th>Client / Lead</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <ClipboardList size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {inquiries.length === 0 ? "No inquiries found." : "No inquiries match your search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.$id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                          <ClipboardList size={13} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{q.service}</p>
                          <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>ID: {q.$id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500, margin: 0 }}>{q.client_name}</p>
                        <p style={{ fontSize: 11, color: "var(--foreground-muted)", margin: 0 }}>{q.client_email}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[q.status] || "badge-draft"}`} style={{ textTransform: "capitalize" }}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <span suppressHydrationWarning style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatRelativeTime(q.$createdAt)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setActiveInquiry(q)}
                          style={{ fontSize: 11, color: "var(--foreground-2)", background: "var(--surface)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}
                        >
                          <Eye size={12} /> View
                        </button>
                        {isAdmin && q.status === "pending" && (
                          <button
                            onClick={() => handleConvert(q)}
                            style={{ fontSize: 11, color: "#FFFFFF", background: "var(--accent)", border: "none", padding: "4.5px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}
                          >
                            Convert
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(q.$id)}
                            style={{ background: "none", border: "none", color: "var(--foreground-faint)", padding: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {activeInquiry && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveInquiry(null); }}
        >
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 540, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", padding: 24 }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)", margin: 0 }}>Inquiry Details</h2>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2, marginBottom: 0 }}>Submitted {new Date(activeInquiry.$createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setActiveInquiry(null)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground-muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Info Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={labelStyle}>Client / Lead</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{activeInquiry.client_name}</span>
                </div>
                <div>
                  <span style={labelStyle}>Email</span>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{activeInquiry.client_email}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={labelStyle}>Service Requested</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{activeInquiry.service}</span>
                </div>
                <div>
                  <span style={labelStyle}>Status</span>
                  <span className={`badge ${STATUS_BADGE[activeInquiry.status]}`} style={{ display: "inline-block", marginTop: 2, textTransform: "capitalize" }}>
                    {activeInquiry.status}
                  </span>
                </div>
              </div>

              <div>
                <span style={labelStyle}>Inquiry Message</span>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, fontSize: 12, color: "var(--foreground-2)", minHeight: 120, maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {activeInquiry.message}
                </div>
              </div>

              {activeInquiry.status === "converted" && activeInquiry.proposal_id && (
                <div style={{ background: "rgba(0,184,114,0.05)", border: "1.5px solid rgba(0,184,114,0.15)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Proposal Draft Created</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--foreground-muted)" }}>This request has been successfully converted.</p>
                  </div>
                  <Link href={`/proposals/${activeInquiry.proposal_id}/edit`} style={{ fontSize: 11, background: "var(--accent)", color: "#FFFFFF", padding: "6px 12px", borderRadius: "var(--radius-sm)", textDecoration: "none", fontWeight: 600 }}>
                    Edit Proposal
                  </Link>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            {isAdmin && activeInquiry.status === "pending" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <button
                  onClick={() => handleDecline(activeInquiry.$id)}
                  disabled={actionLoading}
                  className="btn btn-ghost"
                  style={{ color: "#EF4444", borderColor: "#EF4444", fontSize: 12, padding: "6px 14px" }}
                >
                  Decline Inquiry
                </button>
                <button
                  onClick={() => handleConvert(activeInquiry)}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {actionLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />} Convert to Proposal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Inquiry Modal */}
      {isNewInquiryOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsNewInquiryOpen(false); }}
        >
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", padding: 24 }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)", margin: 0 }}>Submit New Inquiry</h2>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2, marginBottom: 0 }}>Tell us about your project needs</p>
              </div>
              <button
                onClick={() => setIsNewInquiryOpen(false)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground-muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateInquiry} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Service Requested</label>
                <select
                  className="input-base"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  required
                  style={{ width: "100%", height: 38 }}
                >
                  <option value="">Select a service...</option>
                  <option value="Landing Page Redesign">Landing Page Redesign</option>
                  <option value="SaaS Platform Development">SaaS Platform Development</option>
                  <option value="E-commerce Website">E-commerce Website</option>
                  <option value="Mobile App Development">Mobile App Development</option>
                  <option value="Custom Web Application">Custom Web Application</option>
                  <option value="Other">Other (Describe below)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Inquiry Message / Requirements</label>
                <textarea
                  className="input-base"
                  rows={5}
                  placeholder="Outline the main features, objectives, and integrations you expect..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  required
                  style={{ width: "100%", resize: "none", padding: 10 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setIsNewInquiryOpen(false)}
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: "6px 14px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newInquiryLoading}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {newInquiryLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />} Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
