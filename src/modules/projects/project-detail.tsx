"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban, Users, Calendar, ArrowLeft, Loader2, Check, AlertCircle,
  ExternalLink, Receipt, Wallet, TrendingUp, TrendingDown, PiggyBank,
} from "lucide-react";
import Link from "next/link";
import { getProject, updateProject } from "@/services/projects";
import { getClient } from "@/services/crm";
import { getInvoices } from "@/services/invoices";
import { getTransactions } from "@/services/transactions";
import type { Project, Client, Invoice, Transaction } from "@/types";
import { formatDate, formatCurrency, documentRef } from "@/utils";
import { calcProjectFinancials, isOutflow } from "@/lib/finance";
import { INVOICE_STATUS, PROJECT_STATUS_BADGE, TRANSACTION_TYPE_COLOR, statusStyle } from "@/lib/status";

interface ProjectDetailProps {
  id: string;
}

export function ProjectDetail({ id }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<Project["status"]>("planning");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const proj = await getProject(id);
      if (cancelled) return;
      if (proj) {
        setProject(proj);
        setStatus(proj.status);
        const [cl, invs, txs] = await Promise.all([
          getClient(proj.client_id),
          getInvoices(),
          getTransactions({ projectId: id }),
        ]);
        setClient(cl);
        setInvoices(invs.filter((i) => i.project_id === id));
        setTransactions(txs);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
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
      if (project) setProject({ ...project, status: newStatus });
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

  const currency = project.currency || "BDT";
  const budget = project.budget || 0;

  const fin = calcProjectFinancials(budget, invoices, transactions);

  const stats = [
    { label: "Budget",      value: fin.budget,  color: "var(--foreground)",                 icon: PiggyBank,    hint: "Agreed project value" },
    { label: "Invoiced",    value: fin.billed,  color: "#3B72D4",                           icon: Receipt,      hint: "Issued to the client (excludes drafts and cancelled)" },
    { label: "Received",    value: fin.received,color: "#00965C",                           icon: TrendingUp,   hint: "Paid invoices" },
    { label: "Outstanding", value: fin.outstanding, color: "#B45309",                           icon: Wallet,       hint: "Invoiced but awaiting payment" },
    { label: "Expenses",    value: fin.expenses,color: "#D14F4F",                           icon: TrendingDown, hint: "Costs logged against this project" },
    { label: "Net Position",value: fin.net,     color: fin.net >= 0 ? "#00965C" : "#D14F4F",    icon: PiggyBank,    hint: "Received plus other income, minus expenses" },
  ];

  const thStyle = (right: boolean): React.CSSProperties => ({
    padding: "8px 12px", textAlign: right ? "right" : "left", fontSize: 10, fontWeight: 700,
    color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--foreground-muted)", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to Projects list
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        {/* ─── Left column ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FolderKanban size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{project.name}</h2>
                <span className={`badge ${PROJECT_STATUS_BADGE[project.status] || "badge-planning"}`} style={{ textTransform: "capitalize", display: "inline-block", marginTop: 4 }}>
                  {project.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 8 }}>Description</h3>
            <p style={{ fontSize: 13, color: "var(--foreground-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {project.description || "No description provided for this project."}
            </p>
          </div>

          {/* Financial summary */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Financial Summary</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
              {stats.map(({ label, value, color, icon: Icon, hint }) => (
                <div key={label} title={hint} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <Icon size={11} style={{ color: "var(--foreground-muted)" }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color }}>
                    {formatCurrency(value, currency)}
                  </p>
                </div>
              ))}
            </div>

            {/* Collection progress */}
            {budget > 0 && (
              <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--background-alt)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-2)" }}>Collected against budget</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--accent)" }}>{fin.collectedPct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--surface)", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ width: `${fin.collectedPct}%`, height: "100%", background: "linear-gradient(90deg,#00B872,#00E090)", borderRadius: 99 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 8, fontSize: 11, color: "var(--foreground-muted)" }}>
                  <span>Still to collect: <strong style={{ color: fin.dueFromClient > 0 ? "#D14F4F" : "#00965C" }}>{formatCurrency(fin.dueFromClient, currency)}</strong></span>
                  <span>Not yet invoiced: <strong style={{ color: "var(--foreground-2)" }}>{formatCurrency(fin.notYetBilled, currency)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={14} style={{ color: "var(--accent)" }} /> Invoices
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-muted)" }}>({invoices.length})</span>
              </h3>
              <Link href="/invoices/new" className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>New Invoice</Link>
            </div>
            {invoices.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", padding: "12px 0" }}>No invoices raised for this project yet.</p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["Invoice", "Issued", "Due", "Status", "Amount"].map((h, i) => (
                        <th key={h} style={thStyle(i === 4)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const st = statusStyle(INVOICE_STATUS, inv.status);
                      return (
                        <tr key={inv.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <Link href={`/invoices/${inv.$id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", textDecoration: "none" }}>{inv.title}</Link>
                            <p style={{ fontSize: 10, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)" }}>{documentRef("APP-INV", inv.$createdAt, inv.$id)}</p>
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>{formatDate(inv.issue_date)}</td>
                          <td style={{ padding: "10px 12px", color: inv.status === "overdue" ? "#D14F4F" : "var(--foreground-muted)" }}>{formatDate(inv.due_date)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>{inv.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{formatCurrency(inv.total, inv.currency || currency)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "var(--surface)" }}>
                      <td colSpan={4} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total invoiced</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "var(--accent)" }}>{formatCurrency(fin.billed, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <Wallet size={14} style={{ color: "var(--accent)" }} /> Expenses &amp; Transactions
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-muted)" }}>({transactions.length})</span>
              </h3>
              <Link href="/transactions" className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Log Transaction</Link>
            </div>
            {transactions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", padding: "12px 0" }}>
                No transactions linked to this project. Log one from Transactions and pick this project to track its costs here.
              </p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["Description", "Category", "Date", "Type", "Amount"].map((h, i) => (
                        <th key={h} style={thStyle(i === 4)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const out = isOutflow(t);
                      return (
                        <tr key={t.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>{t.description}</td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-2)" }}>{t.category || "General"}</td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>{formatDate(t.transaction_date)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: TRANSACTION_TYPE_COLOR[t.type] || "var(--foreground-muted)" }}>{t.type}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-heading)", color: TRANSACTION_TYPE_COLOR[t.type] }}>
                            {out ? "−" : "+"}{formatCurrency(t.amount, t.currency || currency)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "var(--surface)" }}>
                      <td colSpan={4} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total expenses</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "#D14F4F" }}>−{formatCurrency(fin.expenses, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={13} /> Timeline
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--foreground-muted)" }}>Start Date</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{project.start_date ? formatDate(project.start_date) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--foreground-muted)" }}>Target End</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{project.end_date ? formatDate(project.end_date) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--foreground-muted)" }}>Currency</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{currency}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} style={{ color: "var(--accent)" }} /> Client
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

          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Manage Status</h3>
            <select className="input-base" value={status} onChange={(e) => handleStatusChange(e.target.value as Project["status"])} disabled={updating} style={{ fontSize: 12 }}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {updating && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--foreground-muted)", marginTop: 10 }}>
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving changes...
              </div>
            )}
            {updateSuccess && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00965C", marginTop: 10 }}>
                <Check size={12} /> Status updated!
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
