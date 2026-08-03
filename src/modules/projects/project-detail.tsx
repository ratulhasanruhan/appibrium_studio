"use client";

import React, { useState, useEffect } from "react";
import {
  FolderKanban, Users, Calendar, ArrowLeft, Loader2, Check, AlertCircle,
  ExternalLink, Receipt, Wallet, TrendingUp, TrendingDown, PiggyBank, UserPlus, Trash2, X,
  BadgeDollarSign, FileSignature,
} from "lucide-react";
import Link from "next/link";
import { getProject, updateProject } from "@/services/projects";
import { getClient } from "@/services/crm";
import { getInvoices } from "@/services/invoices";
import { getTransactions, createTransaction } from "@/services/transactions";
import { getPeople } from "@/services/people";
import { sendPayoutNotification } from "@/services/email";
import { sendPayoutSMS } from "@/services/sms";
import { getEngagements, createEngagement, updateEngagement, deleteEngagement } from "@/services/engagements";
import { createLetter, nextReference } from "@/services/letters";
import { buildLetterBody } from "@/modules/letters/letter-templates";
import { SIGNATORIES } from "@/lib/company-profile";
import type { Project, Client, Invoice, Transaction, Person, Engagement } from "@/types";
import { formatDate, formatCurrency, documentRef, randomToken } from "@/utils";
import { calcProjectFinancials, isOutflow } from "@/lib/finance";
import { INVOICE_STATUS, PROJECT_STATUS_BADGE, TRANSACTION_TYPE_COLOR, ENGAGEMENT_STATUS, statusStyle } from "@/lib/status";

interface ProjectDetailProps {
  id: string;
}

export function ProjectDetail({ id }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPersonId, setAssignPersonId] = useState("");
  const [assignBudget, setAssignBudget] = useState(0);
  const [assignTitle, setAssignTitle] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const [payFor, setPayFor] = useState<Engagement | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotify, setPayNotify] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [flash, setFlash] = useState("");
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
        const [cl, invs, txs, ppl, engs] = await Promise.all([
          getClient(proj.client_id),
          getInvoices(),
          getTransactions({ projectId: id }),
          getPeople(),
          getEngagements({ projectId: id }),
        ]);
        setClient(cl);
        setInvoices(invs.filter((i) => i.project_id === id));
        setTransactions(txs);
        setPeople(ppl);
        setEngagements(engs);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  /** Instalments recorded against a specific assignment. */
  function paidFor(e: Engagement): number {
    return transactions
      .filter((t) => t.engagement_id === e.$id && isOutflow(t))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  async function reloadTeam() {
    const [ppl, engs, txs] = await Promise.all([
      getPeople(), getEngagements({ projectId: id }), getTransactions({ projectId: id }),
    ]);
    setPeople(ppl); setEngagements(engs); setTransactions(txs);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignPersonId || !assignBudget) {
      setAssignError("Pick a person and set a budget.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    const person = people.find((p) => p.$id === assignPersonId);
    const res = await createEngagement({
      person_id: assignPersonId,
      project_id: id,
      title: assignTitle.trim() || `${person?.role || "Work"} — ${project?.name ?? "Project"}`,
      rate_type: "fixed",
      agreed_amount: assignBudget,
      currency: project?.currency || "BDT",
      status: "active",
      start_date: new Date().toISOString().slice(0, 10),
    });
    setAssigning(false);
    if (res.success) {
      setAssignOpen(false);
      setAssignPersonId(""); setAssignBudget(0); setAssignTitle("");
      reloadTeam();
    } else {
      setAssignError(res.error || "Failed to assign.");
    }
  }

  /** Records one instalment against a specific assignment. */
  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor || !payAmount) { setPayError("Enter an amount."); return; }
    const person = people.find((p) => p.$id === payFor.person_id);
    const alreadyPaid = paidFor(payFor);
    const remaining = Math.max(payFor.agreed_amount - alreadyPaid, 0);
    if (payAmount > remaining) {
      setPayError(`That exceeds the remaining ${formatCurrency(remaining, currency)} on this assignment.`);
      return;
    }
    setPaying(true);
    setPayError("");
    const res = await createTransaction({
      type: "expense",
      amount: payAmount,
      currency: payFor.currency || currency,
      status: "completed",
      category: "Team Payout",
      description: payNote.trim() || `${payFor.title} — instalment`,
      transaction_date: payDate,
      person_id: payFor.person_id,
      project_id: id,
      engagement_id: payFor.$id,
    });
    setPaying(false);
    if (!res.success) { setPayError(res.error || "Failed to record payment."); return; }

    // Best-effort confirmation; never blocks a payment that is already recorded.
    if (payNotify && person) {
      const left = Math.max(remaining - payAmount, 0);
      try {
        if (person.email) {
          await sendPayoutNotification(person.email, person.name, formatCurrency(payAmount, currency),
            payFor.title, formatDate(payDate), project?.name, formatCurrency(left, currency));
        }
        if (person.phone) {
          await sendPayoutSMS(person.phone, person.name, formatCurrency(payAmount, currency), payFor.title);
        }
      } catch (err) {
        console.error("[Project] payout notification failed:", err);
      }
    }
    setFlash(`Recorded ${formatCurrency(payAmount, currency)} to ${person?.name ?? "team member"}.`);
    setTimeout(() => setFlash(""), 5000);
    setPayFor(null); setPayAmount(0); setPayNote("");
    reloadTeam();
  }

  /**
   * Creates a letterhead agreement recording the agreed terms for one
   * assignment, and links it back so the row opens the stored document.
   */
  async function handleGenerateAgreement(e: Engagement) {
    const person = people.find((p) => p.$id === e.person_id);
    if (!person) return;
    const signatory = SIGNATORIES[0];
    const body = buildLetterBody("agreement", {
      party_name: person.name,
      party_address: person.role || "",
      effective_date: e.start_date || new Date().toISOString().slice(0, 10),
      term: `Duration of the ${project?.name ?? "project"} engagement`,
      value: formatCurrency(e.agreed_amount, e.currency || currency),
      scope: e.title,
      payment_terms: "Payable in instalments against agreed milestones, by bank transfer or mobile banking.",
    });
    const reference = await nextReference("APP-AGR");
    const res = await createLetter({
      client_id: undefined,
      type: "agreement",
      title: `Work Agreement — ${person.name}`,
      reference,
      recipient_name: person.name,
      recipient_role: person.role,
      body_html: body,
      field_values: JSON.stringify({ engagement_id: e.$id, project_id: id }),
      status: "draft",
      public_token: randomToken("ltr"),
      requires_signature: true,
      show_company_signature: true,
      signatory_name: signatory.name,
      signatory_signature: signatory.signature,
      signatory_title: signatory.title,
      issue_date: new Date().toISOString().slice(0, 10),
    });
    if (res.success && res.data) {
      await updateEngagement(e.$id, { document_id: res.data.$id });
      setFlash(`Agreement ${reference} created for ${person.name}.`);
      setTimeout(() => setFlash(""), 5000);
      reloadTeam();
    } else {
      alert("Could not create the agreement: " + res.error);
    }
  }

  async function handleUnassign(eid: string, name: string) {
    if (!confirm(`Remove ${name} from this project? Payouts already recorded stay in the expense log.`)) return;
    const res = await deleteEngagement(eid);
    if (res.success) reloadTeam();
    else alert("Failed to remove: " + res.error);
  }

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

  // Team budget committed on this project, and how much of it has been paid.
  const teamBudget = engagements
    .filter((e) => e.status !== "cancelled")
    .reduce((s2, e) => s2 + (e.agreed_amount || 0), 0);
  const teamPaid = transactions
    .filter((t) => t.engagement_id && isOutflow(t))
    .reduce((s2, t) => s2 + (t.amount || 0), 0);
  const teamDue = Math.max(teamBudget - teamPaid, 0);

  const stats = [
    { label: "Budget",      value: fin.budget,  color: "var(--foreground)",                 icon: PiggyBank,    hint: "Agreed project value" },
    { label: "Invoiced",    value: fin.billed,  color: "#3B72D4",                           icon: Receipt,      hint: "Issued to the client (excludes drafts and cancelled)" },
    { label: "Received",    value: fin.received,color: "#00965C",                           icon: TrendingUp,   hint: "Paid invoices" },
    { label: "Outstanding", value: fin.outstanding, color: "#B45309",                           icon: Wallet,       hint: "Invoiced but awaiting payment" },
    { label: "Expenses",    value: fin.expenses,color: "#D14F4F",                           icon: TrendingDown, hint: "Costs logged against this project" },
    { label: "Net Position",value: fin.net,     color: fin.net >= 0 ? "#00965C" : "#D14F4F",    icon: PiggyBank,    hint: "Received plus other income, minus expenses" },
  ];

  const assignLabel: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
  };

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

      {flash && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#E6FAF3", border: "1px solid #B3E8D2", borderRadius: "var(--radius-md)", fontSize: 12, color: "#00965C" }}>
          <Check size={14} /> {flash}
        </div>
      )}

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

          {/* Team & Assignments */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <UserPlus size={14} style={{ color: "var(--accent)" }} /> Team &amp; Budgets
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-muted)" }}>({engagements.length})</span>
              </h3>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setAssignOpen(true)}>
                <UserPlus size={12} /> Assign Person
              </button>
            </div>
            {engagements.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", padding: "12px 0" }}>
                Nobody assigned yet. Assign a team member and fix their budget for this project.
              </p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["Member", "Status", "Budget", "Paid", "Due", ""].map((h, i) => (
                        <th key={h || "act"} style={thStyle(i >= 2 && i <= 4)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map((e) => {
                      const person = people.find((p) => p.$id === e.person_id);
                      const paid = paidFor(e);
                      const due = Math.max(e.agreed_amount - paid, 0);
                      const st = statusStyle(ENGAGEMENT_STATUS, e.status);
                      return (
                        <tr key={e.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <Link href={`/people/${e.person_id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", textDecoration: "none" }}>
                              {person?.name || "Unknown"}
                            </Link>
                            <p style={{ fontSize: 10, color: "var(--foreground-muted)" }}>{e.title}</p>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>{e.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-2)" }}>{formatCurrency(e.agreed_amount, e.currency || currency)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#00965C", fontWeight: 600 }}>{formatCurrency(paid, currency)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: due > 0 ? 700 : 400, color: due > 0 ? "#D14F4F" : "var(--foreground-muted)" }}>{formatCurrency(due, currency)}</td>
                          <td style={{ padding: "10px 8px" }}>
                            <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => { setPayFor(e); setPayAmount(0); setPayError(""); }}
                                disabled={due <= 0}
                                title={due > 0 ? "Record a payment" : "Fully paid"}
                                style={{ background: due > 0 ? "var(--accent-subtle)" : "transparent", border: "none", cursor: due > 0 ? "pointer" : "default", color: due > 0 ? "var(--accent)" : "var(--foreground-faint)", padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}
                              >
                                <BadgeDollarSign size={11} /> Pay
                              </button>
                              {e.document_id ? (
                                <Link href={`/letters/${e.document_id}/edit`} title="Open agreement" style={{ color: "var(--accent)", display: "flex", padding: 3 }}>
                                  <FileSignature size={12} />
                                </Link>
                              ) : (
                                <button onClick={() => handleGenerateAgreement(e)} title="Create agreement document" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 3 }}>
                                  <FileSignature size={12} />
                                </button>
                              )}
                              <button onClick={() => handleUnassign(e.$id, person?.name || "this member")} title="Remove from project" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 3 }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "var(--surface)" }}>
                      <td colSpan={2} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Team budget</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "var(--accent)" }}>{formatCurrency(teamBudget, currency)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "#00965C" }}>{formatCurrency(teamPaid, currency)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: teamDue > 0 ? "#D14F4F" : "var(--foreground-muted)" }}>{formatCurrency(teamDue, currency)}</td>
                      <td />
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

      {/* Assign person modal */}
      {assignOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setAssignOpen(false)} />
          <form onSubmit={handleAssign} style={{ position: "relative", width: "100%", maxWidth: 440, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Assign to Project</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Fix a budget for this person on {project.name}</p>
              </div>
              <button type="button" onClick={() => setAssignOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)" }}><X size={16} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={assignLabel}>Team Member *</label>
                <select
                  className="input-base"
                  style={{ fontSize: 12 }}
                  value={assignPersonId}
                  onChange={(ev) => setAssignPersonId(ev.target.value)}
                  required
                >
                  <option value="">Select a person...</option>
                  {people
                    .filter((p) => p.status === "active" && !engagements.some((e) => e.person_id === p.$id))
                    .map((p) => (
                      <option key={p.$id} value={p.$id}>{p.name}{p.role ? ` — ${p.role}` : ""}</option>
                    ))}
                </select>
                <p style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4 }}>
                  People already assigned to this project are hidden. Add new people under Team.
                </p>
              </div>
              <div>
                <label style={assignLabel}>Budget for this project *</label>
                <input className="input-base" type="number" style={{ fontSize: 12 }} value={assignBudget || ""} onChange={(ev) => setAssignBudget(Number(ev.target.value))} placeholder="40000" required />
                <p style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4 }}>
                  What you commit to pay this person for their work on this project. Paid in instalments.
                </p>
              </div>
              <div>
                <label style={assignLabel}>Work / Scope</label>
                <input className="input-base" style={{ fontSize: 12 }} value={assignTitle} onChange={(ev) => setAssignTitle(ev.target.value)} placeholder="UI design for the dashboard" />
              </div>
            </div>

            {assignError && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#D14F4F", background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "8px 12px", borderRadius: "var(--radius-md)" }}>
                <AlertCircle size={13} /> {assignError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setAssignOpen(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={assigning}>
                {assigning ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={13} />}
                {assigning ? "Assigning..." : "Assign & Set Budget"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record instalment */}
      {payFor && (() => {
        const person = people.find((pp) => pp.$id === payFor.person_id);
        const already = paidFor(payFor);
        const remaining = Math.max(payFor.agreed_amount - already, 0);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setPayFor(null)} />
            <form onSubmit={handlePay} style={{ position: "relative", width: "100%", maxWidth: 430, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Record Payment</h2>
                  <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{person?.name} · {payFor.title}</p>
                </div>
                <button type="button" onClick={() => setPayFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)" }}><X size={16} /></button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 14, fontSize: 12 }}>
                <span style={{ color: "var(--foreground-muted)" }}>Budget {formatCurrency(payFor.agreed_amount, currency)}</span>
                <span style={{ color: "#00965C" }}>Paid {formatCurrency(already, currency)}</span>
                <span style={{ fontWeight: 700, color: remaining > 0 ? "#D14F4F" : "#00965C" }}>Left {formatCurrency(remaining, currency)}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={assignLabel}>Amount *</label>
                  <input className="input-base" type="number" style={{ fontSize: 12 }} value={payAmount || ""} onChange={(ev) => setPayAmount(Number(ev.target.value))} placeholder="5000" required autoFocus />
                </div>
                <div>
                  <label style={assignLabel}>Date</label>
                  <input className="input-base" type="date" style={{ fontSize: 12 }} value={payDate} onChange={(ev) => setPayDate(ev.target.value)} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={assignLabel}>Note</label>
                  <input className="input-base" style={{ fontSize: 12 }} value={payNote} onChange={(ev) => setPayNote(ev.target.value)} placeholder="Milestone 1 — wireframes delivered" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[0.25, 0.5, 1].map((f) => (
                  <button key={f} type="button" onClick={() => setPayAmount(Math.round(remaining * f))}
                    style={{ flex: 1, padding: "5px 0", fontSize: 11, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground-muted)", cursor: "pointer" }}>
                    {f === 1 ? "Full remaining" : `${f * 100}%`}
                  </button>
                ))}
              </div>

              <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", marginTop: 14 }}>
                <input type="checkbox" checked={payNotify} onChange={(ev) => setPayNotify(ev.target.checked)} style={{ marginTop: 2, accentColor: "var(--accent)" }} />
                <span style={{ fontSize: 11.5, color: "var(--foreground-2)" }}>
                  Notify {person?.name?.split(" ")[0] || "them"} by email and SMS with the remaining balance
                </span>
              </label>

              {payError && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#D14F4F", background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "8px 12px", borderRadius: "var(--radius-md)" }}>
                  <AlertCircle size={13} /> {payError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => setPayFor(null)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={paying}>
                  {paying ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <BadgeDollarSign size={13} />}
                  {paying ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        );
      })()}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
