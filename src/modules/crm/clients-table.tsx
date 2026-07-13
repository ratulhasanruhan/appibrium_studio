"use client";

import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import type { Client } from "@/types";
import { formatDate, initials } from "@/utils";

const MOCK_CLIENTS: Client[] = [
  { $id: "c1", name: "TechFlow Inc.",   legal_name: "TechFlow Incorporated", email: "contact@techflow.io",  phone: "+1 555 0101", website: "techflow.io",        status: "active",   $createdAt: "2025-03-15T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z" },
  { $id: "c2", name: "BuildSmart Ltd.", email: "hello@buildsmart.co",        phone: "+1 555 0202",          website: "buildsmart.co",     status: "active",   $createdAt: "2025-06-10T00:00:00Z", $updatedAt: "2026-06-15T00:00:00Z" },
  { $id: "c3", name: "DataSync Corp.",  email: "ops@datasync.com",                                          website: "datasync.com",      status: "active",   $createdAt: "2025-08-22T00:00:00Z", $updatedAt: "2026-07-05T00:00:00Z" },
  { $id: "c4", name: "CloudNova",       email: "info@cloudnova.io",                                         website: "cloudnova.io",      status: "lead",     $createdAt: "2026-06-01T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z" },
  { $id: "c5", name: "Nexus Systems",   email: "hello@nexus.systems",                                       website: "nexus.systems",     status: "inactive", $createdAt: "2024-11-03T00:00:00Z", $updatedAt: "2025-12-01T00:00:00Z" },
  { $id: "c6", name: "Orion Digital",   email: "dev@oriondigital.net",                                      website: "oriondigital.net",  status: "lead",     $createdAt: "2026-07-10T00:00:00Z", $updatedAt: "2026-07-10T00:00:00Z" },
];

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

import { useRouter } from "next/navigation";

export function ClientsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Client["status"]>("all");

  const filtered = MOCK_CLIENTS.filter((c) => {
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

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div
        style={{
          background: "var(--background-alt)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Added</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "44px", color: "var(--foreground-muted)" }}>
                  No clients match your search.
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const av = avatarColors[client.status] ?? avatarColors.inactive;
                return (
                  <tr
                    key={client.$id}
                    onClick={() => router.push(`/crm/${client.$id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "var(--radius-md)",
                            background: av.bg,
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: av.color,
                            fontFamily: "var(--font-heading)",
                            flexShrink: 0,
                          }}
                        >
                          {initials(client.name)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                            {client.name}
                          </p>
                          {client.website && (
                            <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{client.website}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <a
                        href={`mailto:${client.email}`}
                        style={{ color: "var(--foreground-muted)", fontSize: 12, textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {client.email}
                      </a>
                    </td>
                    <td>
                      <span style={{ color: "var(--foreground-muted)", fontSize: 12 }}>
                        {client.phone ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[client.status]}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--foreground-muted)", fontSize: 12 }}>
                        {formatDate(client.$createdAt)}
                      </span>
                    </td>
                    <td>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--foreground-faint)",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          transition: "color 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground-faint)")}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
