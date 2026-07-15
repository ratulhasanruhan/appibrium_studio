"use client";

import { useState, useEffect } from "react";
import { Search, FileText, ExternalLink, Send, Clock, Loader2 } from "lucide-react";
import type { Proposal, Client } from "@/types";
import { formatRelativeTime } from "@/utils";
import Link from "next/link";
import { getProposals } from "@/services/proposals";
import { getClients } from "@/services/crm";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type ProposalWithClient = Proposal & { client_name: string };

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
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const user = await account.get();
        const labels = (user as any).labels || [];
        const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
        setIsAdmin(admin);

        let rawProposals: Proposal[] = [];
        let clients: Client[] = [];

        if (!admin) {
          const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
            Query.equal("email", user.email),
            Query.limit(1)
          ]);
          if (clientRes.documents.length > 0) {
            const clientDbId = clientRes.documents[0].$id;
            rawProposals = await getProposals(clientDbId);
            clients = [clientRes.documents[0] as unknown as Client];
          }
        } else {
          const [allProps, allClis] = await Promise.all([
            getProposals(),
            getClients(),
          ]);
          rawProposals = allProps;
          clients = allClis;
        }

        const clientMap = new Map<string, string>(clients.map((c) => [c.$id, c.name]));
        const enriched: ProposalWithClient[] = rawProposals.map((p) => ({
          ...p,
          client_name: clientMap.get(p.client_id) ?? "Unknown Client",
        }));
        setProposals(enriched);
      } catch (err) {
        console.error("[ProposalsList] load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = proposals.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.title.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q) ||
      p.$id.toLowerCase().includes(q);
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
            {loading ? "Loading..." : `${filtered.length} proposal${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading proposals from database...</span>
          </div>
        ) : (
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
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <FileText size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {proposals.length === 0 ? "No proposals yet. Create your first proposal!" : "No proposals match your search."}
                      </p>
                    </div>
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
                            APP-PROP-{new Date(p.$createdAt).getFullYear()}-{p.$id.slice(-4).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{p.client_name}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-draft"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {isAdmin && (
                          <Link
                            href={`/proposals/${p.$id}/edit`}
                            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "4px 8px", borderRadius: "var(--radius-sm)", background: "var(--accent-subtle)", border: "1px solid rgba(0,184,114,0.15)", fontWeight: 500, fontFamily: "var(--font-body)" }}
                          >
                            Edit
                          </Link>
                        )}
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
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
