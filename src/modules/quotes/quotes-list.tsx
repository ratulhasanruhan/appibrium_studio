"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Check, X, Trash2, Loader2, Eye, ClipboardList } from "lucide-react";
import type { Quote, Client } from "@/types";
import { formatRelativeTime } from "@/utils";
import Link from "next/link";
import { getQuotes, updateQuoteStatus, deleteQuote } from "@/services/quotes";
import { createProposal } from "@/services/proposals";
import { getClients } from "@/services/crm";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type QuoteWithClient = Quote & { client_name: string; client_email: string };

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge-planning",
  converted: "badge-accepted",
  declined:  "badge-rejected",
};

type StatusFilter = "all" | Quote["status"];
const FILTERS: StatusFilter[] = ["all", "pending", "converted", "declined"];

export function QuotesList() {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<StatusFilter>("all");
  const [quotes, setQuotes]   = useState<QuoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeQuote, setActiveQuote] = useState<QuoteWithClient | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const user = await account.get();
      const labels = (user as any).labels || [];
      const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
      setIsAdmin(admin);

      let rawQuotes: Quote[] = [];
      let clients: Client[] = [];

      if (!admin) {
        // Logged-in customer gets their matching client ID
        const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
          Query.equal("email", user.email),
          Query.limit(1)
        ]);
        if (clientRes.documents.length > 0) {
          const clientDbId = clientRes.documents[0].$id;
          rawQuotes = await getQuotes(clientDbId);
          clients = [clientRes.documents[0] as unknown as Client];
        }
      } else {
        // Admin gets all quotes
        const [allQuotes, allClis] = await Promise.all([
          getQuotes(),
          getClients(),
        ]);
        rawQuotes = allQuotes;
        clients = allClis;
      }

      const clientMap = new Map<string, { name: string; email: string }>(
        clients.map((c) => [c.$id, { name: c.name, email: c.email }])
      );

      const enriched: QuoteWithClient[] = rawQuotes.map((q) => {
        const cli = clientMap.get(q.client_id);
        return {
          ...q,
          client_name: cli?.name ?? "Unknown Lead",
          client_email: cli?.email ?? "N/A",
        };
      });

      setQuotes(enriched);
    } catch (err) {
      console.error("[QuotesList] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleConvert(quote: QuoteWithClient) {
    if (!confirm(`Convert quote request for "${quote.service}" into a draft proposal?`)) return;
    setActionLoading(true);
    try {
      const publicToken = "tok_" + Math.random().toString(36).substring(2, 10);
      const draftContent = `
        <h2>1. Quote Request Executive Summary</h2>
        <p>Requested by <strong>${quote.client_name}</strong> for <strong>${quote.service}</strong>.</p>
        <p><strong>Original Request Details:</strong></p>
        <div style="padding: 12px; background: #F3FBF7; border-left: 4px solid #00B872; margin: 10px 0; border-radius: var(--radius-sm);">
          ${quote.message.replace(/\n/g, "<br />")}
        </div>
        <h2>2. Proposed Architecture & Scope</h2>
        <p>[Admin, edit this text to add architecture details and estimated pricing...]</p>
      `;

      const proposalResult = await createProposal({
        client_id: quote.client_id,
        title: `${quote.service} Proposal`,
        status: "draft",
        content_html: draftContent.trim(),
        public_token: publicToken,
        version: 1,
        currency: "BDT",
      });

      if (proposalResult.success && proposalResult.data) {
        const proposalId = proposalResult.data.$id;
        const updateResult = await updateQuoteStatus(quote.$id, "converted", proposalId);
        
        if (updateResult.success) {
          // Success
          setActiveQuote(null);
          // Redirect to the proposal editor
          window.location.href = `/proposals/${proposalId}/edit`;
        } else {
          alert("Failed to update quote status: " + updateResult.error);
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
    if (!confirm("Are you sure you want to decline this quote request?")) return;
    const res = await updateQuoteStatus(id, "declined");
    if (res.success) {
      setQuotes(prev => prev.map(q => q.$id === id ? { ...q, status: "declined" as const } : q));
      setActiveQuote(null);
    } else {
      alert("Failed to decline quote: " + res.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this quote request?")) return;
    const res = await deleteQuote(id);
    if (res.success) {
      setQuotes(prev => prev.filter(q => q.$id !== id));
      setActiveQuote(null);
    } else {
      alert("Failed to delete quote: " + res.error);
    }
  }

  const filtered = quotes.filter((q) => {
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
          <input id="quote-search" className="input-base" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((s) => (
            <button
              key={s}
              id={`quote-filter-${s}`}
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
        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
            {loading ? "Loading..." : `${filtered.length} request${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading quote requests...</span>
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
                        {quotes.length === 0 ? "No quote requests found." : "No quotes match your search."}
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
                          onClick={() => setActiveQuote(q)}
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

      {/* Quote Detail Modal */}
      {activeQuote && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveQuote(null); }}
        >
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 540, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", padding: 24 }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)", margin: 0 }}>Quote Request Details</h2>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2, marginBottom: 0 }}>Submitted {new Date(activeQuote.$createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setActiveQuote(null)}
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{activeQuote.client_name}</span>
                </div>
                <div>
                  <span style={labelStyle}>Email</span>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{activeQuote.client_email}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={labelStyle}>Service Requested</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{activeQuote.service}</span>
                </div>
                <div>
                  <span style={labelStyle}>Status</span>
                  <span className={`badge ${STATUS_BADGE[activeQuote.status]}`} style={{ display: "inline-block", marginTop: 2, textTransform: "capitalize" }}>
                    {activeQuote.status}
                  </span>
                </div>
              </div>

              <div>
                <span style={labelStyle}>Inquiry Message</span>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, fontSize: 12, color: "var(--foreground-2)", minHeight: 120, maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {activeQuote.message}
                </div>
              </div>

              {activeQuote.status === "converted" && activeQuote.proposal_id && (
                <div style={{ background: "rgba(0,184,114,0.05)", border: "1.5px solid rgba(0,184,114,0.15)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Proposal Draft Created</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--foreground-muted)" }}>This request has been successfully converted.</p>
                  </div>
                  <Link href={`/proposals/${activeQuote.proposal_id}/edit`} style={{ fontSize: 11, background: "var(--accent)", color: "#FFFFFF", padding: "6px 12px", borderRadius: "var(--radius-sm)", textDecoration: "none", fontWeight: 600 }}>
                    Edit Proposal
                  </Link>
                </div>
              )}
            </div>

            {/* Footer / Actions */}
            {isAdmin && activeQuote.status === "pending" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <button
                  onClick={() => handleDecline(activeQuote.$id)}
                  disabled={actionLoading}
                  className="btn btn-ghost"
                  style={{ color: "#EF4444", borderColor: "#EF4444", fontSize: 12, padding: "6px 14px" }}
                >
                  Decline Quote
                </button>
                <button
                  onClick={() => handleConvert(activeQuote)}
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
