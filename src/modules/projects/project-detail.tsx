"use client";

import React, { useState, useEffect } from "react";
import { FolderKanban, Users, Calendar, DollarSign, ArrowLeft, Loader2, Check, AlertCircle, ExternalLink, Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import { getProject, updateProject } from "@/services/projects";
import { getClient } from "@/services/crm";
import type { Project, Client, Invoice } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

interface ProjectDetailProps {
  id: string;
}

const STATUS_BADGE: Record<string, string> = {
  planning:  "badge-planning",
  active:    "badge-active",
  completed: "badge-completed",
  on_hold:   "badge-on-hold",
  cancelled: "badge-cancelled",
};

export function ProjectDetail({ id }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient]   = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Change state
  const [status, setStatus]   = useState<Project["status"]>("planning");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const proj = await getProject(id);
      if (proj) {
        setProject(proj);
        setStatus(proj.status);
        const [cl, invoicesRes] = await Promise.all([
          getClient(proj.client_id),
          databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, [Query.equal("project_id", id)]),
        ]);
        setClient(cl);
        setInvoices(invoicesRes.documents as unknown as Invoice[]);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleStatusChange(newStatus: Project["status"]) {
    setStatus(newStatus);
    setUpdating(true);
    setUpdateSuccess(false);
    const res = await updateProject(id, { status: newStatus });
    setUpdating(false);
    if (res.success) {
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      if (project) {
        setProject({ ...project, status: newStatus });
      }
    } else {
      alert("Failed to update project status: " + res.error);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        <span style={{ fontSize: 13, color: "var(--foreground-muted)" }}>Loading project details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={32} style={{ color: "#D14F4F" }} />
        <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>Project not found in the database.</p>
        <Link href="/projects" className="btn btn-ghost" style={{ fontSize: 12 }}>
          <ArrowLeft size={13} /> Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back Button */}
      <div>
        <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--foreground-muted)", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to Projects list
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Left Side: General Overview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Main Card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FolderKanban size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{project.name}</h2>
                <span className={`badge ${STATUS_BADGE[project.status] || "badge-planning"}`} style={{ textTransform: "capitalize", display: "inline-block", marginTop: 4 }}>
                  {project.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 8 }}>Project Description</h3>
            <p style={{ fontSize: 13, color: "var(--foreground-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {project.description || "No description provided for this project."}
            </p>
          </div>

          {/* Dates & Budget Metadata */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} /> Project Timeline
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>Start Date</span>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{project.start_date ? formatDate(project.start_date) : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>Target End Date</span>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{project.end_date ? formatDate(project.end_date) : "—"}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <DollarSign size={13} /> Project Budget
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>Est. Budget</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>
                    {project.budget ? formatCurrency(project.budget, project.currency) : "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>Currency</span>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{project.currency || "BDT"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Client Info & Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Client Details */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} style={{ color: "var(--accent)" }} /> Client / Organization
            </h3>
            {client ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{client.name}</p>
                  {client.legal_name && <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>{client.legal_name}</p>}
                </div>
                <div style={{ height: 1, background: "var(--border)" }} />
                {[
                  { label: "Email", value: client.email },
                  { label: "Phone", value: client.phone },
                  { label: "Website", value: client.website },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 10, color: "var(--foreground-muted)", textTransform: "uppercase" }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: "var(--foreground)", wordBreak: "break-all" }}>{row.value}</span>
                  </div>
                ))}
                <Link href={`/crm/${client.$id}`} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 4 }}>
                  <ExternalLink size={12} /> CRM Workspace
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No client record linked.</p>
            )}
          </div>

          {/* Linked Invoices */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <DollarSign size={14} style={{ color: "var(--accent)" }} /> Project Invoices
            </h3>
            {invoices.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {invoices.map((inv) => {
                  const ref = `APP-INV-${new Date(inv.$createdAt).getFullYear()}-${inv.$id.slice(-4).toUpperCase()}`;
                  return (
                    <div key={inv.$id} style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Link href={`/invoices/${inv.$id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", textDecoration: "none" }} className="hover-link">
                          {inv.title}
                        </Link>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)" }}>{ref}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(inv.total, inv.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No invoices generated for this project.</p>
            )}
          </div>

          {/* Status Controls */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Manage Status</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", textTransform: "uppercase", marginBottom: 6 }}>Project Status</label>
                <select
                  className="input-base"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  disabled={updating}
                  style={{ fontSize: 12 }}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {updating && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--foreground-muted)" }}>
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving changes...
                </div>
              )}

              {updateSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00965C" }}>
                  <Check size={12} /> Status updated!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
