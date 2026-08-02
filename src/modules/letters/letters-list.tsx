"use client";

import { useState, useEffect } from "react";
import { Search, FileSignature, ExternalLink, Loader2, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import { getLetters, deleteLetter } from "@/services/letters";
import { getClients } from "@/services/crm";
import { LETTER_TEMPLATES } from "./letter-templates";
import type { Letter, Client } from "@/types";
import { formatDate } from "@/utils";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:    { bg: "#F5F5F5", color: "#6B7280" },
  sent:     { bg: "#EEF4FF", color: "#3B72D4" },
  viewed:   { bg: "#FFFBEB", color: "#B45309" },
  signed:   { bg: "#E6FAF3", color: "#00965C" },
  declined: { bg: "#FEF2F2", color: "#D14F4F" },
};

export function LettersList() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  async function load() {
    try {
      const [ls, cs] = await Promise.all([getLetters(), getClients()]);
      setLetters(ls);
      setClients(cs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const clientMap = new Map(clients.map((c) => [c.$id, c.name]));

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await deleteLetter(id);
    if (res.success) load();
    else alert("Failed to delete: " + res.error);
  }

  const filtered = letters.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      l.title.toLowerCase().includes(q) ||
      l.reference.toLowerCase().includes(q) ||
      (l.recipient_name || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || l.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 260 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input className="input-base" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[{ id: "all", label: "All" }, ...LETTER_TEMPLATES.map((t) => ({ id: t.id, label: t.label }))].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              style={{
                padding: "5px 11px", borderRadius: "var(--radius-md)", fontSize: 11.5, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: typeFilter === t.id ? 600 : 400,
                background: typeFilter === t.id ? "var(--accent-subtle)" : "var(--background-alt)",
                color: typeFilter === t.id ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${typeFilter === t.id ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading documents...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <FileSignature size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {letters.length === 0 ? "No documents yet. Create your first letterhead document." : "No documents match your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((l) => {
                const tpl = LETTER_TEMPLATES.find((t) => t.id === l.type);
                const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.draft;
                return (
                  <tr key={l.$id}>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{l.title}</p>
                      <span style={{ fontSize: 10.5, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)" }}>{l.reference}</span>
                    </td>
                    <td><span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{tpl?.label ?? l.type}</span></td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
                        {l.client_id ? clientMap.get(l.client_id) ?? "—" : l.recipient_name || "Internal"}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatDate(l.issue_date)}</span></td>
                    <td>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <a href={`/public/letter/${l.public_token}`} target="_blank" rel="noreferrer" title="Open letterhead" style={{ color: "var(--foreground-faint)", display: "flex", padding: 4 }}>
                          <ExternalLink size={13} />
                        </a>
                        <Link href={`/letters/${l.$id}/edit`} title="Edit" style={{ color: "var(--foreground-faint)", display: "flex", padding: 4 }}>
                          <Edit2 size={13} />
                        </Link>
                        <button onClick={() => handleDelete(l.$id, l.title)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
