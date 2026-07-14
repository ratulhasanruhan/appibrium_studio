"use client";

import { useState, useEffect } from "react";
import { Search, ExternalLink, Loader2, Users } from "lucide-react";
import type { Client } from "@/types";
import { formatDate, initials } from "@/utils";
import { useRouter } from "next/navigation";
import { getClients } from "@/services/crm";
import Link from "next/link";

const statusBadge: Record<string, string> = {
  active:   "badge-active",
  lead:     "badge-lead",
  inactive: "badge-inactive",
};

const avatarColors: Record<string, { bg: string; color: string }> = {
  active:   { bg: "#E6FAF3", color: "#00965C" },
  lead:     { bg: "#F3F0FF", color: "#6D3FC7" },
  inactive: { bg: "#F5F5F5", color: "#9CA3AF" },
};

export function ClientsTable() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Client["status"]>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getClients();
        setClients(data);
      } catch (err) {
        console.error("[ClientsTable] load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* ─── Toolbar ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {/* Search */}
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input
            id="client-search"
            className="input-base"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "active", "lead", "inactive"] as const).map((s) => (
            <button
              key={s}
              id={`filter-${s}`}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 12px",
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
            {loading ? "Loading..." : `${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading clients from database...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Added</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Users size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {clients.length === 0 ? "No clients yet. Add your first client!" : "No clients match your search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const av = avatarColors[c.status] || avatarColors["lead"];
                  return (
                    <tr
                      key={c.$id}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/crm/${c.$id}`)}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "var(--radius-md)",
                              background: av.bg,
                              color: av.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "var(--font-heading)",
                              flexShrink: 0,
                            }}
                          >
                            {initials(c.name)}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{c.name}</p>
                            {c.website && (
                              <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{c.website}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{c.email}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{c.phone || "—"}</span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[c.status] || "badge-lead"}`} style={{ textTransform: "capitalize" }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <span suppressHydrationWarning style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatDate(c.$createdAt)}</span>
                      </td>
                      <td>
                        <Link
                          href={`/crm/${c.$id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--foreground-faint)")}
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
