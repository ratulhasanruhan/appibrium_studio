"use client";

import { useState } from "react";
import { Search, Receipt, ExternalLink, MessageSquare } from "lucide-react";
import type { Invoice } from "@/types";
import { formatDate, formatCurrency, formatRelativeTime } from "@/utils";
import Link from "next/link";

const MOCK_INVOICES: (Invoice & { client_name: string; client_phone?: string })[] = [
  {
    $id: "i1", client_id: "c1", client_name: "TechFlow Inc.", client_phone: "+8801711000001",
    title: "E-Commerce Platform Development — Phase 1",
    status: "paid", issue_date: "2026-05-01T00:00:00Z", due_date: "2026-05-15T00:00:00Z",
    subtotal: 120000, tax: 0, discount: 0, total: 120000, currency: "BDT",
    public_token: "inv_tok_001", paid_at: "2026-05-12T00:00:00Z",
    $createdAt: "2026-05-01T00:00:00Z",
  },
  {
    $id: "i2", client_id: "c2", client_name: "BuildSmart Ltd.", client_phone: "+8801822000002",
    title: "Cloud Infrastructure Setup — Q2",
    status: "sent", issue_date: "2026-06-15T00:00:00Z", due_date: "2026-06-30T00:00:00Z",
    subtotal: 85000, tax: 0, discount: 5000, total: 80000, currency: "BDT",
    public_token: "inv_tok_002",
    $createdAt: "2026-06-15T00:00:00Z",
  },
  {
    $id: "i3", client_id: "c3", client_name: "DataSync Corp.", client_phone: "+8801933000003",
    title: "AI Analytics Dashboard — Milestone 2",
    status: "overdue", issue_date: "2026-06-01T00:00:00Z", due_date: "2026-06-20T00:00:00Z",
    subtotal: 60000, tax: 0, discount: 0, total: 60000, currency: "BDT",
    public_token: "inv_tok_003",
    $createdAt: "2026-06-01T00:00:00Z",
  },
  {
    $id: "i4", client_id: "c4", client_name: "CloudNova",
    title: "IoT Prototype Development",
    status: "draft", issue_date: "2026-07-10T00:00:00Z", due_date: "2026-07-25T00:00:00Z",
    subtotal: 45000, tax: 0, discount: 0, total: 45000, currency: "BDT",
    public_token: "inv_tok_004",
    $createdAt: "2026-07-10T00:00:00Z",
  },
];

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = MOCK_INVOICES.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = inv.title.toLowerCase().includes(q) || inv.client_name.toLowerCase().includes(q);
    const matchFilter = filter === "all" || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const totalOutstanding = MOCK_INVOICES
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.total, 0);

  return (
    <div>

      {/* Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Invoiced", value: MOCK_INVOICES.reduce((s, i) => s + i.total, 0), color: "var(--foreground)" },
          { label: "Outstanding",    value: totalOutstanding,                                    color: "#D14F4F" },
          { label: "Paid",           value: MOCK_INVOICES.filter(i => i.status === "paid").reduce((s,i) => s + i.total, 0), color: "#00965C" },
          { label: "Draft",          value: MOCK_INVOICES.filter(i => i.status === "draft").reduce((s,i) => s + i.total, 0), color: "var(--foreground-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", boxShadow: "var(--shadow-xs)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{label}</p>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color }}>{formatCurrency(value, "BDT")}</p>
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
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--foreground-muted)" }}>
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
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
                <td colSpan={6} style={{ textAlign: "center", padding: "44px", color: "var(--foreground-muted)" }}>
                  No invoices found.
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
                          APP-INV-{new Date(inv.$createdAt).getFullYear()}-{inv.$id.slice(-2).padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground-2)" }}>{inv.client_name}</p>
                      {inv.client_phone && (
                        <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{inv.client_phone}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>
                      {formatCurrency(inv.total, inv.currency)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
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
                      {inv.client_phone && (
                        <button
                          title="Send SMS"
                          style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)", background: "none", border: "none", cursor: "pointer", transition: "color 0.1s" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--foreground-faint)")}
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}
                      <a href={`/public/invoice/${inv.public_token}`} target="_blank" style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)", transition: "color 0.1s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--foreground-faint)")}
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
