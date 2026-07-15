"use client";

import { useState, useEffect } from "react";
import { Search, FolderKanban, ExternalLink, Plus, Loader2, X, AlertCircle, Check } from "lucide-react";
import type { Project, Client } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { getProjects, createProject } from "@/services/projects";
import { getClients } from "@/services/crm";
import Link from "next/link";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type ProjectWithClient = Project & { client_name: string };

const STATUS_BADGE: Record<string, string> = {
  planning:  "badge-planning",
  active:    "badge-active",
  completed: "badge-completed",
  on_hold:   "badge-on-hold",
  cancelled: "badge-cancelled",
};

export function ProjectsList() {
  const [projects, setProjects]   = useState<ProjectWithClient[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAdmin, setIsAdmin]     = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // New Project Form
  const [title, setTitle]         = useState("");
  const [clientId, setClientId]   = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget]       = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [pStatus, setPStatus]     = useState<Project["status"]>("planning");

  async function loadData() {
    setLoading(true);
    try {
      const user = await account.get();
      const labels = (user as any).labels || [];
      const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
      setIsAdmin(admin);

      let projList: Project[] = [];
      let cliList: Client[] = [];

      if (!admin) {
        // Retrieve client ID by matching user email
        const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
          Query.equal("email", user.email),
          Query.limit(1)
        ]);
        if (clientRes.documents.length > 0) {
          const clientDbId = clientRes.documents[0].$id;
          projList = await getProjects(clientDbId);
          cliList = [clientRes.documents[0] as unknown as Client];
        }
      } else {
        const [allProjs, allClis] = await Promise.all([getProjects(), getClients()]);
        projList = allProjs;
        cliList = allClis;
      }

      const clientMap = new Map(cliList.map((c) => [c.$id, c.name]));
      const enriched = projList.map((p) => ({
        ...p,
        client_name: clientMap.get(p.client_id) ?? "Unknown Client",
      }));
      setProjects(enriched);
      setClients(cliList);
    } catch (err) {
      console.error("[ProjectsList] load data error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
    const matchesFilter = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !clientId) {
      setSaveError("Project title and client are required.");
      setSaveStatus("error");
      return;
    }

    setSaving(true);
    setSaveError("");
    const result = await createProject({
      name: title,
      client_id: clientId,
      description,
      status: pStatus,
      budget: budget || undefined,
      currency: "BDT",
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });

    setSaving(false);
    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => {
        setShowModal(false);
        setSaveStatus("idle");
        setTitle(""); setClientId(""); setDescription(""); setBudget(0); setStartDate(""); setEndDate(""); setPStatus("planning");
        loadData();
      }, 800);
    } else {
      setSaveError(result.error || "Failed to create project.");
      setSaveStatus("error");
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--foreground-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input className="input-base" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "planning", "active", "completed", "on_hold", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "5px 12px", borderRadius: "var(--radius-md)", fontSize: 12,
                fontFamily: "var(--font-body)", fontWeight: statusFilter === s ? 600 : 400, cursor: "pointer",
                background: statusFilter === s ? "var(--accent-subtle)" : "var(--background-alt)",
                color: statusFilter === s ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${statusFilter === s ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
                transition: "all 0.1s", textTransform: "capitalize",
              }}
            >{s}</button>
          ))}
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto", fontSize: 12, padding: "7px 14px" }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={13} /> New Project
          </button>
        )}
      </div>

      {/* Projects Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading projects from database...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Budget</th>
                <th>Timeline</th>
                <th>Status</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <FolderKanban size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {projects.length === 0 ? "No projects yet. Get started by creating one!" : "No projects match your search."}
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
                          <FolderKanban size={13} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{p.name}</p>
                          {p.description && <p style={{ fontSize: 11, color: "var(--foreground-muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{p.client_name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                        {p.budget ? formatCurrency(p.budget, p.currency) : "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
                        {p.start_date ? formatDate(p.start_date) : "—"} to {p.end_date ? formatDate(p.end_date) : "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-planning"}`} style={{ textTransform: "capitalize" }}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <Link href={`/projects/${p.$id}`} style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4 }}>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Add Project Modal ─── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowModal(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>New Project</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Initialize a new project in the database</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground-muted)" }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Client *</label>
                <select className="input-base" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.$id} value={c.$id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Project Title *</label>
                <input className="input-base" placeholder="e.g. Website Redesign" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea className="input-base" rows={2} placeholder="Outline project scope..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Budget (BDT)</label>
                  <input type="number" className="input-base" placeholder="Amount" value={budget || ""} onChange={(e) => setBudget(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select className="input-base" value={pStatus} onChange={(e) => setPStatus(e.target.value as any)}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" className="input-base" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>End/Target Date</label>
                  <input type="date" className="input-base" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {saveStatus === "error" && (
                <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={saving}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> :
                   saveStatus === "saved" ? <Check size={13} /> : <Plus size={13} />}
                  {saving ? "Creating..." : saveStatus === "saved" ? "Created!" : "Create Project"}
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
