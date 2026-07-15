"use client";

import { useState, useEffect } from "react";
import { Search, FolderKanban, ExternalLink, Plus, Loader2, X, AlertCircle, Check, Trash2, Edit2 } from "lucide-react";
import type { Project, Client, Invoice } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { getProjects, createProject, updateProject, deleteProject } from "@/services/projects";
import { getClients } from "@/services/crm";
import { sendProjectNotification } from "@/services/email";
import Link from "next/link";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

type ProjectWithClient = Project & {
  client_name: string;
  paid_amount: number;
  due_amount: number;
};

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

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<ProjectWithClient | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudget, setEditBudget] = useState(0);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState<Project["status"]>("planning");
  const [editing, setEditing] = useState(false);

  // New Project Form Fields
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

      // Query database for items
      if (!admin) {
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

      // Query all invoices to compute paid/due summaries
      const invoicesRes = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, [Query.limit(100)]);
      const invoices = invoicesRes.documents as unknown as Invoice[];
      
      const invoiceGroup = new Map<string, Invoice[]>();
      invoices.forEach((inv) => {
        if (inv.project_id) {
          if (!invoiceGroup.has(inv.project_id)) {
            invoiceGroup.set(inv.project_id, []);
          }
          invoiceGroup.get(inv.project_id)!.push(inv);
        }
      });

      const clientMap = new Map(cliList.map((c) => [c.$id, c.name]));
      
      const enriched = projList.map((p) => {
        const projInvs = invoiceGroup.get(p.$id) || [];
        let paid = 0;
        let due = 0;
        projInvs.forEach((inv) => {
          if (inv.status === "paid") {
            paid += inv.total;
          } else if (inv.status !== "cancelled" && inv.status !== "draft") {
            due += inv.total;
          }
        });

        return {
          ...p,
          client_name: clientMap.get(p.client_id) ?? "Unknown Client",
          paid_amount: paid,
          due_amount: due,
        };
      });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !clientId) {
      setSaveError("Please fill out all required fields.");
      return;
    }
    setSaving(true);
    setSaveError("");

    const result = await createProject({
      name: title,
      client_id: clientId,
      description,
      budget,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: pStatus,
      currency: "BDT",
    });

    setSaving(false);
    if (result.success) {
      setSaveStatus("saved");
      try {
        const selectedCli = clients.find((c) => c.$id === clientId);
        if (selectedCli && selectedCli.email) {
          await sendProjectNotification(selectedCli.email, selectedCli.name, title);
        }
      } catch (emailErr) {
        console.error("Failed to send project notification email:", emailErr);
      }
      setTimeout(() => {
        setShowModal(false);
        setSaveStatus("idle");
        setTitle("");
        setClientId("");
        setDescription("");
        setBudget(0);
        setStartDate("");
        setEndDate("");
        setPStatus("planning");
        loadData();
      }, 1000);
    } else {
      setSaveStatus("error");
      setSaveError(result.error || "Failed to create project");
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject || !editTitle) return;
    setEditing(true);

    const result = await updateProject(editingProject.$id, {
      name: editTitle,
      description: editDescription,
      budget: editBudget,
      start_date: editStartDate || undefined,
      end_date: editEndDate || undefined,
      status: editStatus,
    });

    setEditing(false);
    if (result.success) {
      setEditingProject(null);
      loadData();
    } else {
      alert("Failed to update project: " + result.error);
    }
  }

  function startEdit(p: ProjectWithClient) {
    setEditingProject(p);
    setEditTitle(p.name);
    setEditDescription(p.description || "");
    setEditBudget(p.budget || 0);
    setEditStartDate(p.start_date ? p.start_date.slice(0, 10) : "");
    setEditEndDate(p.end_date ? p.end_date.slice(0, 10) : "");
    setEditStatus(p.status);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;
    const res = await deleteProject(id);
    if (res.success) {
      loadData();
    } else {
      alert("Failed to delete project: " + res.error);
    }
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q);
    const matchFilter = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchFilter;
  });

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
                <th>Invoiced / Billing</th>
                <th>Timeline</th>
                <th>Status</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "60px 20px" }}>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 11, color: "#00965C", fontWeight: 600 }}>Paid: {formatCurrency(p.paid_amount, p.currency)}</span>
                        <span style={{ fontSize: 11, color: p.due_amount > 0 ? "#D14F4F" : "var(--foreground-muted)", fontWeight: p.due_amount > 0 ? 600 : 400 }}>Due: {formatCurrency(p.due_amount, p.currency)}</span>
                      </div>
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
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/projects/${p.$id}`} style={{ color: "var(--foreground-faint)", display: "flex", alignItems: "center", padding: 4, borderRadius: "var(--radius-sm)" }} title="View Workspace">
                          <ExternalLink size={13} />
                        </Link>
                        {isAdmin && (
                          <>
                            <button onClick={() => startEdit(p)} style={{ background: "none", border: "none", color: "var(--foreground-faint)", padding: 4, cursor: "pointer" }} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(p.$id, p.name)} style={{ background: "none", border: "none", color: "var(--foreground-faint)", padding: 4, cursor: "pointer" }} title="Delete">
                              <Trash2 size={13} />
                            </button>
                          </>
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

      {/* ─── CREATE PROJECT MODAL ─── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,35,23,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <form onSubmit={handleCreate} className="card" style={{ width: "100%", maxWidth: 440, padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-heading)" }}>New Project</h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--foreground-muted)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            
            {saveError && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#D14F4F", fontSize: 12, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FAC5C5", borderRadius: "var(--radius-md)", marginBottom: 12 }}>
                <AlertCircle size={14} /> {saveError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Client *</label>
                <select className="input-base" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                  <option value="">Select client...</option>
                  {clients.map((c) => <option key={c.$id} value={c.$id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Project Title *</label>
                <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Website Redesign" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Est. Budget (BDT)</label>
                <input className="input-base" type="number" value={budget || ""} onChange={(e) => setBudget(Number(e.target.value))} placeholder="Amount in BDT" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Start Date</label>
                  <input className="input-base" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>End Date</label>
                  <input className="input-base" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Description</label>
                <textarea className="input-base" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Project description and notes..." rows={3} style={{ resize: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : saveStatus === "saved" ? "Created!" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── EDIT PROJECT MODAL ─── */}
      {editingProject && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,35,23,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <form onSubmit={handleEditSave} className="card" style={{ width: "100%", maxWidth: 440, padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Edit Project</h2>
              <button type="button" onClick={() => setEditingProject(null)} style={{ background: "none", border: "none", color: "var(--foreground-muted)", cursor: "pointer" }}><X size={16} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Project Title *</label>
                <input className="input-base" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Est. Budget (BDT)</label>
                <input className="input-base" type="number" value={editBudget || ""} onChange={(e) => setEditBudget(Number(e.target.value))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Start Date</label>
                  <input className="input-base" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>End Date</label>
                  <input className="input-base" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Project Status</label>
                <select className="input-base" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Description</label>
                <textarea className="input-base" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} style={{ resize: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingProject(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editing}>
                {editing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
