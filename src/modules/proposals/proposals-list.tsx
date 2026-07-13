"use client";

import { useState } from "react";
import { Search, FileText, ExternalLink, Send, Clock } from "lucide-react";
import type { Proposal } from "@/types";
import { formatDate, formatRelativeTime } from "@/utils";
import Link from "next/link";

const MOCK_PROPOSALS: (Proposal & { client_name: string })[] = [
  {
    $id: "p1", client_id: "c1", client_name: "TechFlow Inc.", title: "E-Commerce Platform Development",
    status: "accepted", public_token: "tok_abc123", version: 2, currency: "BDT",
    sent_at: "2026-06-10T00:00:00Z", viewed_at: "2026-06-11T00:00:00Z", accepted_at: "2026-06-12T00:00:00Z",
    $createdAt: "2026-06-08T00:00:00Z", $updatedAt: "2026-06-12T00:00:00Z",
  },
  {
    $id: "p2", client_id: "c2", client_name: "BuildSmart Ltd.", title: "Cloud Infrastructure Migration",
    status: "sent", public_token: "tok_def456", version: 1, currency: "BDT",
    sent_at: "2026-07-01T00:00:00Z",
    $createdAt: "2026-06-28T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    $id: "p3", client_id: "c3", client_name: "DataSync Corp.", title: "AI Data Pipeline & Analytics Dashboard",
    status: "viewed", public_token: "tok_ghi789", version: 3, currency: "BDT",
    sent_at: "2026-07-05T00:00:00Z", viewed_at: "2026-07-06T00:00:00Z",
    $createdAt: "2026-07-03T00:00:00Z", $updatedAt: "2026-07-06T00:00:00Z",
  },
  {
    $id: "p4", client_id: "c4", client_name: "CloudNova", title: "IoT Fleet Management System",
    status: "draft", public_token: "tok_jkl012", version: 1, currency: "BDT",
    $createdAt: "2026-07-10T00:00:00Z", $updatedAt: "2026-07-10T00:00:00Z",
  },
  {
    $id: "p5", client_id: "c1", client_name: "TechFlow Inc.", title: "Mobile App Redesign — Phase 2",
    status: "review", public_token: "tok_mno345", version: 1, currency: "BDT",
    $createdAt: "2026-07-11T00:00:00Z", $updatedAt: "2026-07-12T00:00:00Z",
  },
  {
    $id: "p6", client_id: "c5", client_name: "Nexus Systems", title: "ERP Integration Proposal",
    status: "rejected", public_token: "tok_pqr678", version: 2, currency: "BDT",
    sent_at: "2026-05-15T00:00:00Z",
    $createdAt: "2026-05-12T00:00:00Z", $updatedAt: "2026-05-20T00:00:00Z",
  },
];

const STATUS_BADGE: Record<string, string> = {
  draft:    "badge-draft",
  review:   "badge-planning",
  sent:     "badge-sent",
  viewed:   "badge-viewed",
  accepted: "badge-accepted",
  rejected: "badge-rejected",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:     <Send size={11} />,
  viewed:   <Clock size={11} />,
  accepted: <span>✓</span>,
};

type StatusFilter = "all" | Proposal["status"];
const FILTERS: StatusFilter[] = ["all", "draft", "review", "sent", "viewed", "accepted", "rejected"];

export function ProposalsList() {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<StatusFilter>("all");

  const filtered = MOCK_PROPOSALS.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.title.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q) || p.$id.toLowerCase().includes(q);
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input id="proposal-search" className="input-base" placeholder="Search proposals..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map((s) => (
            <button
              key={s}
              id={`proposal-filter-${s}`}
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
            {filtered.length} proposal{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Client</th>
              <th>Status</th>
              <th>Version</th>
              <th>Last Updated</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "44px", color: "var(--foreground-muted)" }}>
                  No proposals found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.$id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                        <FileText size={13} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{p.title}</p>
                        <p style={{ fontSize: 11, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.02em" }}>
                          APP-PROP-{new Date(p.$createdAt).getFullYear()}-{p.$id.slice(-3).padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{p.client_name}</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status]}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {STATUS_ICON[p.status]}
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>v{p.version}</span>
                  </td>
                  <td>
                    <span suppressHydrationWarning style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatRelativeTime(p.$updatedAt)}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <Link
                        href={`/proposals/${p.$id}/edit`}
                        style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "4px 8px", borderRadius: "var(--radius-sm)", background: "var(--accent-subtle)", border: "1px solid rgba(0,184,114,0.15)", fontWeight: 500, fontFamily: "var(--font-body)" }}
                      >
                        Edit
                      </Link>
                      <a
                        href={`/public/proposal/${p.public_token}`}
                        target="_blank"
                        style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)", transition: "color 0.1s" }}
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
