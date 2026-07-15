"use client";

import { useState, useEffect } from "react";
import { Search, Receipt, ExternalLink, MessageSquare, Loader2 } from "lucide-react";
import type { Invoice, Client } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import Link from "next/link";
import { getInvoices } from "@/services/invoices";
import { getClients } from "@/services/crm";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type InvoiceWithClient = Invoice & { client_name: string; client_phone?: string };

const STATUS_BADGE: Record<string, string> = {
  draft:     "badge-draft",
  sent:      "badge-sent",
  paid:      "badge-paid",
  overdue:   "badge-overdue",
  cancelled: "badge-cancelled",
};

type StatusFilter = "all" | Invoice["status"];
const FILTERS: StatusFilter[] = ["all", "draft", "sent", "paid", "overdue", "cancelled"];

export function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<StatusFilter>("all");
  const [isAdmin,  setIsAdmin]  = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const user = await account.get();
        const labels = (user as any).labels || [];
        const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
        setIsAdmin(admin);

        let rawInvoices: Invoice[] = [];
        let clients: Client[] = [];

        if (!admin) {
          const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
            Query.equal("email", user.email),
            Query.limit(1)
          ]);
          if (clientRes.documents.length > 0) {
            const clientDbId = clientRes.documents[0].$id;
            rawInvoices = await getInvoices(clientDbId);
            clients = [clientRes.documents[0] as unknown as Client];
          }
        } else {
          const [allInvs, allClis] = await Promise.all([getInvoices(), getClients()]);
          rawInvoices = allInvs;
          clients = allClis;
        }

        const clientMap = new Map<string, Client>(clients.map((c) => [c.$id, c]));
        const enriched: InvoiceWithClient[] = rawInvoices.map((inv) => ({
          ...inv,
          client_name:  clientMap.get(inv.client_id)?.name  ?? "Unknown Client",
          client_phone: clientMap.get(inv.client_id)?.phone ?? undefined,
        }));
        setInvoices(enriched);
      } catch (err) {
        console.error("[InvoiceList] load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = inv.title.toLowerCase().includes(q) || inv.client_name.toLowerCase().includes(q);
    const matchFilter = filter === "all" || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const totalInvoiced   = invoices.reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalPaid       = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalDraft      = invoices.filter((i) => i.status === "draft").reduce((s, i) => s + i.total, 0);

  return (
    <div>
      {/* Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Invoiced", value: totalInvoiced,   color: "var(--foreground)" },
          { label: "Outstanding",    value: totalOutstanding, color: "#D14F4F" },
          { label: "Paid",           value: totalPaid,        color: "#00965C" },
          { label: "Draft",          value: totalDraft,       color: "var(--foreground-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", boxShadow: "var(--shadow-xs)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{label}</p>
            {loading
              ? <div style={{ height: 28, width: 80, background: "var(--surface)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
              : <p style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color }}>{formatCurrency(value, "BDT")}</p>
            }
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input id="invoice-search" className="input-base" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((s) => (
            <button
              key={s}
              id={`invoice-filter-${s}`}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 11px", borderRadius: "var(--radius-md)", fontSize: 12,
                fontFamily: "var(--font-body)", fontWeight: filter === s ? 600 : 400, cursor: "pointer",
                background: filter === s ? "var(--accent-subtle)" : "var(--background-alt)",
                color: filter === s ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${filter === s ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
                transition: "all 0.1s", textTransform: "capitalize", boxShadow: "var(--shadow-xs)",
              }}
            >{s}</button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--foreground-muted)" }}>
          {loading ? "Loading..." : `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading invoices from database...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Receipt size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {invoices.length === 0 ? "No invoices yet. Create your first invoice!" : "No invoices match your search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.$id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "var(--radius-md)", background: inv.status === "overdue" ? "#FEF2F2" : "var(--surface)", border: `1px solid ${inv.status === "overdue" ? "#FAC5C5" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: inv.status === "overdue" ? "#D14F4F" : "var(--accent)", flexShrink: 0 }}>
                          <Receipt size={13} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{inv.title}</p>
                          <p style={{ fontSize: 11, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.02em" }}>
                            APP-INV-{new Date(inv.$createdAt).getFullYear()}-{inv.$id.slice(-4).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-2)" }}>{inv.client_name}</p>
                        {inv.client_phone && <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{inv.client_phone}</p>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[inv.status] || "badge-draft"}`} style={{ textTransform: "capitalize" }}>{inv.status}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: inv.status === "overdue" ? "#D14F4F" : "var(--foreground-muted)", fontWeight: inv.status === "overdue" ? 600 : 400 }}>
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <Link href={`/invoices/${inv.$id}`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "4px 8px", borderRadius: "var(--radius-sm)", background: "var(--accent-subtle)", border: "1px solid rgba(0,184,114,0.15)", fontWeight: 500, fontFamily: "var(--font-body)" }}>
                          View
                        </Link>
                        {isAdmin && inv.client_phone && (
                          <button title="Send SMS" style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", transition: "color 0.1s" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--foreground-faint)")}>
                            <MessageSquare size={13} />
                          </button>
                        )}
                        <a href={`/public/invoice/${inv.public_token}`} target="_blank" style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)", transition: "color 0.1s" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--foreground-faint)")}>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
