"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Loader2, AlertCircle, Plus, X, Briefcase,
  Wallet, TrendingUp, PiggyBank, Trash2, Link as LinkIcon, FileText, Copy, Check, FileSignature,
} from "lucide-react";
import Link from "next/link";
import { getPerson, updatePerson } from "@/services/people";
import { getEngagements, createEngagement, updateEngagement, deleteEngagement } from "@/services/engagements";
import { createLetter, nextReference } from "@/services/letters";
import { buildLetterBody, LETTER_TEMPLATES } from "@/modules/letters/letter-templates";
import { SIGNATORIES } from "@/lib/company-profile";
import { randomToken } from "@/utils";
import { getTransactions } from "@/services/transactions";
import { getProjects } from "@/services/projects";
import { calcPersonFinancials } from "@/lib/finance";
import { ENGAGEMENT_STATUS, TRANSACTION_TYPE_COLOR, statusStyle } from "@/lib/status";
import { formatDate, formatCurrency } from "@/utils";
import type { Person, Engagement, Transaction, Project } from "@/types";

interface PersonDetailProps {
  id: string;
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};

const thStyle = (right: boolean): React.CSSProperties => ({
  padding: "8px 12px", textAlign: right ? "right" : "left", fontSize: 10, fontWeight: 700,
  color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
});

export function PersonDetail({ id }: PersonDetailProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [rateType, setRateType] = useState<Engagement["rate_type"]>("fixed");
  const [amount, setAmount] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);
  const [docFor, setDocFor] = useState<Engagement | null>(null);
  const [docType, setDocType] = useState("agreement");
  const [makingDoc, setMakingDoc] = useState(false);
  const [flash, setFlash] = useState("");

  /** Single loader used by both the initial effect and post-mutation refreshes. */
  async function load(signal?: { cancelled: boolean }) {
    const [p, es, txs, projs] = await Promise.all([
      getPerson(id),
      getEngagements({ personId: id }),
      getTransactions({ personId: id }),
      getProjects(),
    ]);
    if (signal?.cancelled) return;
    setPerson(p);
    setEngagements(es);
    setPayouts(txs);
    setProjects(projs);
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    // load() awaits before touching state, so nothing is set synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(signal);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddEngagement(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) { setError("Title and agreed amount are required."); return; }
    setSaving(true);
    setError("");
    const res = await createEngagement({
      person_id: id,
      project_id: projectId || undefined,
      title: title.trim(),
      rate_type: rateType,
      agreed_amount: amount,
      currency: person?.currency || "BDT",
      status: "active",
      start_date: startDate || undefined,
    });
    setSaving(false);
    if (res.success) {
      setShowModal(false);
      setTitle(""); setAmount(0); setProjectId("");
      load();
    } else {
      setError(res.error || "Failed to create engagement.");
    }
  }

  /**
   * Turns an engagement into a letterhead document on demand — never
   * automatically. The chosen template is pre-filled from the engagement and
   * linked back, so the row afterwards opens the stored document.
   */
  async function handleCreateDocument() {
    if (!docFor || !person) return;
    setMakingDoc(true);
    const tpl = LETTER_TEMPLATES.find((t) => t.id === docType) ?? LETTER_TEMPLATES[0];
    const signatory = SIGNATORIES[0];
    const project = projects.find((p) => p.$id === docFor.project_id);
    const amount = formatCurrency(docFor.agreed_amount, docFor.currency || currency);

    // Each template reads different keys; supply the union and let it pick.
    const body = buildLetterBody(tpl.id, {
      party_name: person.name,
      party_address: person.role || "",
      effective_date: docFor.start_date || new Date().toISOString().slice(0, 10),
      term: project ? `Duration of the ${project.name} engagement` : "As agreed between both parties",
      value: amount,
      scope: docFor.title,
      payment_terms: "Payable in instalments against agreed milestones, by bank transfer or mobile banking.",
      person: person.name,
      role: person.role || "",
      achievement: docFor.title,
      occasion: project ? `on the ${project.name} project` : "",
      candidate: person.name,
      position: person.role || "",
      salary: amount,
      joining_date: docFor.start_date || "",
      subject_name: person.name,
      from_date: docFor.start_date || "",
      to_date: docFor.end_date || "",
      remarks: docFor.title,
      statement: `${person.name} is engaged by Appibrium Technology Co. for ${docFor.title}.`,
      body: `This document relates to ${docFor.title}.`,
      salutation: `Dear ${person.name},`,
    });

    const reference = await nextReference(tpl.refPrefix);
    const res = await createLetter({
      type: tpl.id,
      title: `${tpl.defaultTitle} — ${person.name}`,
      reference,
      recipient_name: person.name,
      recipient_role: person.role,
      body_html: body,
      field_values: JSON.stringify({ engagement_id: docFor.$id, project_id: docFor.project_id }),
      status: "draft",
      public_token: randomToken("ltr"),
      requires_signature: tpl.signByDefault,
      show_company_signature: true,
      signatory_name: signatory.name,
      signatory_signature: signatory.signature,
      signatory_title: signatory.title,
      issue_date: new Date().toISOString().slice(0, 10),
    } as Parameters<typeof createLetter>[0]);

    setMakingDoc(false);
    if (res.success && res.data) {
      await updateEngagement(docFor.$id, { document_id: res.data.$id });
      setDocFor(null);
      setFlash(`${tpl.label} ${reference} created for ${person.name}.`);
      setTimeout(() => setFlash(""), 6000);
      load();
    } else {
      alert("Could not create the document: " + res.error);
    }
  }

  async function handleDeleteEngagement(eid: string, t: string) {
    if (!confirm(`Delete engagement "${t}"? Payouts already logged are not removed.`)) return;
    const res = await deleteEngagement(eid);
    if (res.success) load();
    else alert("Failed to delete: " + res.error);
  }

  async function toggleStatus() {
    if (!person) return;
    const next = person.status === "active" ? "inactive" : "active";
    const res = await updatePerson(id, { status: next });
    if (res.success) setPerson({ ...person, status: next });
  }

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        <span style={{ fontSize: 13, color: "var(--foreground-muted)" }}>Loading person...</span>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={32} style={{ color: "#D14F4F" }} />
        <p style={{ color: "var(--foreground-muted)", fontSize: 13 }}>Person not found.</p>
        <Link href="/people" className="btn btn-ghost" style={{ fontSize: 12 }}><ArrowLeft size={13} /> Back to Team</Link>
      </div>
    );
  }

  const currency = person.currency || "BDT";
  const fin = calcPersonFinancials(engagements, payouts);
  const reportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/team/${person.public_token}`
    : `/public/team/${person.public_token}`;

  function copyReportLink() {
    navigator.clipboard?.writeText(reportUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }
  const projectName = (pid?: string) => projects.find((p) => p.$id === pid)?.name;

  const stats = [
    { label: "Agreed", value: fin.agreed, color: "var(--foreground)", icon: Briefcase, hint: "Total committed across engagements" },
    { label: "Paid", value: fin.paid, color: "#00965C", icon: TrendingUp, hint: "Total paid out so far" },
    { label: "Still Owed", value: fin.due, color: fin.due > 0 ? "#D14F4F" : "#00965C", icon: Wallet, hint: "Agreed minus paid" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link href="/people" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--foreground-muted)", textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to Team
        </Link>
      </div>

      {flash && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "#E6FAF3", border: "1px solid #B3E8D2", borderRadius: "var(--radius-md)", fontSize: 12, color: "#00965C" }}>
          <Check size={14} /> {flash}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Payment summary */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Payment Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
              {stats.map(({ label, value, color, icon: Icon, hint }) => (
                <div key={label} title={hint} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <Icon size={11} style={{ color: "var(--foreground-muted)" }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color }}>{formatCurrency(value, currency)}</p>
                </div>
              ))}
            </div>
            {fin.agreed > 0 && (
              <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--background-alt)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-2)" }}>Settled</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--accent)" }}>{fin.settledPct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--surface)", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ width: `${fin.settledPct}%`, height: "100%", background: "linear-gradient(90deg,#00B872,#00E090)", borderRadius: 99 }} />
                </div>
              </div>
            )}
          </div>

          {/* Engagements */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <Briefcase size={14} style={{ color: "var(--accent)" }} /> Engagements
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-muted)" }}>({engagements.length})</span>
              </h3>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setShowModal(true)}>
                <Plus size={12} /> New Engagement
              </button>
            </div>
            {engagements.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", padding: "12px 0" }}>
                No engagements yet. Add one to record what you have agreed to pay — for a project or a pay period.
              </p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["Engagement", "Project", "Basis", "Status", "Agreed", ""].map((h, i) => (
                        <th key={h || "act"} style={thStyle(i === 4)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map((e) => {
                      const st = statusStyle(ENGAGEMENT_STATUS, e.status);
                      return (
                        <tr key={e.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>
                            {e.title}
                            {e.start_date && <p style={{ fontSize: 10, color: "var(--foreground-muted)", fontWeight: 400 }}>from {formatDate(e.start_date)}</p>}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>
                            {e.project_id
                              ? <Link href={`/projects/${e.project_id}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{projectName(e.project_id) || "Project"}</Link>
                              : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-2)", textTransform: "capitalize" }}>{e.rate_type}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>{e.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{formatCurrency(e.agreed_amount, e.currency || currency)}</td>
                          <td style={{ padding: "10px 8px" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                              {e.document_id ? (
                                <Link href={`/letters/${e.document_id}/edit`} title="Open document" style={{ color: "var(--accent)", display: "flex", padding: 3 }}>
                                  <FileSignature size={12} />
                                </Link>
                              ) : (
                                <button
                                  onClick={() => { setDocFor(e); setDocType("agreement"); }}
                                  title="Create a document from this engagement"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 3 }}
                                >
                                  <FileSignature size={12} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteEngagement(e.$id, e.title)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 3 }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "var(--surface)" }}>
                      <td colSpan={4} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total agreed</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "var(--accent)" }}>{formatCurrency(fin.agreed, currency)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout ledger */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                <Wallet size={14} style={{ color: "var(--accent)" }} /> Payout History
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-muted)" }}>({payouts.length})</span>
              </h3>
              <Link href="/transactions" className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Record Payout</Link>
            </div>
            {payouts.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", padding: "12px 0" }}>
                No payouts recorded. Log an expense from Transactions and select this person under &ldquo;Paid To&rdquo;.
              </p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["Description", "Project", "Date", "Amount"].map((h, i) => (
                        <th key={h} style={thStyle(i === 3)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((t) => (
                      <tr key={t.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>{t.description}</td>
                        <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>{t.project_id ? projectName(t.project_id) || "—" : "—"}</td>
                        <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>{formatDate(t.transaction_date)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-heading)", color: TRANSACTION_TYPE_COLOR[t.type] }}>
                          {formatCurrency(t.amount, t.currency || currency)}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: "var(--surface)" }}>
                      <td colSpan={3} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total paid</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", fontSize: 13, color: "#00965C" }}>{formatCurrency(fin.paid, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-subtle)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-heading)", fontSize: 14 }}>
                {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{person.name}</h2>
                {person.role && <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{person.role}</p>}
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)", marginBottom: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { label: "Type", value: person.type },
                { label: "Role", value: person.role },
                { label: "Email", value: person.email },
                { label: "Phone", value: person.phone },
                { label: "Payout", value: person.payout_method ? `${person.payout_method} · ${person.payout_details || "—"}` : undefined },
                { label: "Joined", value: person.joined_date ? formatDate(person.joined_date) : undefined },
              ].filter((r) => r.value).map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: "var(--foreground)", textAlign: "right", textTransform: r.label === "Type" || r.label === "Payout" ? "capitalize" : "none", wordBreak: "break-all" }}>{r.value}</span>
                </div>
              ))}
            </div>
            {person.portfolio_url && (
              <a href={person.portfolio_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 12 }}>
                <LinkIcon size={12} /> View Portfolio
              </a>
            )}
            {person.public_token && (
              <a href={`/public/team/${person.public_token}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 8 }}>
                <FileText size={12} /> Open Their Report
              </a>
            )}
            <button onClick={toggleStatus} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 8 }}>
              Mark as {person.status === "active" ? "Inactive" : "Active"}
            </button>
          </div>

          {person.public_token && (
            <div className="card">
              <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={13} style={{ color: "var(--accent)" }} /> Shareable Report
              </h3>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginBottom: 10 }}>
                Send this private link to {person.name.split(" ")[0]} so they can track their assignments and payments without a login.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value={reportUrl} className="input-base" style={{ fontSize: 10.5, flex: 1, fontFamily: "var(--font-mono, monospace)" }} />
                <button onClick={copyReportLink} className="btn btn-ghost" style={{ fontSize: 11, padding: "0 10px" }} title="Copy link">
                  {copied ? <Check size={12} style={{ color: "#00965C" }} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <PiggyBank size={14} style={{ color: "var(--foreground-muted)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground-2)" }}>How this adds up</h4>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.55, marginTop: 4 }}>
                Engagements record what you agreed to pay. Payouts are expenses tagged to this person — they also count as costs on any project they are linked to.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New engagement modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowModal(false)} />
          <form onSubmit={handleAddEngagement} style={{ position: "relative", width: "100%", maxWidth: 460, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>New Engagement</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>What you have agreed to pay {person.name}</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)" }}><X size={16} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Title *</label>
                <input className="input-base" style={{ fontSize: 12 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ZanVerify frontend build — or — August salary" required />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Project (Optional)</label>
                <select className="input-base" style={{ fontSize: 12 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">No project — general or salaried</option>
                  {projects.map((p) => <option key={p.$id} value={p.$id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Basis</label>
                <select className="input-base" style={{ fontSize: 12 }} value={rateType} onChange={(e) => setRateType(e.target.value as Engagement["rate_type"])}>
                  <option value="fixed">Fixed</option>
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Agreed Amount *</label>
                <input className="input-base" type="number" style={{ fontSize: 12 }} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="40000" required />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Start Date</label>
                <input className="input-base" type="date" style={{ fontSize: 12 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#D14F4F", background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "8px 12px", borderRadius: "var(--radius-md)" }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={saving}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
                {saving ? "Creating..." : "Create Engagement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create a document from an engagement */}
      {docFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setDocFor(null)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 460, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Create Document</h2>
              <button onClick={() => setDocFor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)" }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 14 }}>
              For <strong style={{ color: "var(--foreground)" }}>{docFor.title}</strong> — {formatCurrency(docFor.agreed_amount, docFor.currency || currency)}
            </p>

            <label style={labelStyle}>Document Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {LETTER_TEMPLATES.map((t) => {
                const active = docType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDocType(t.id)}
                    style={{
                      textAlign: "left", cursor: "pointer", padding: "9px 11px", borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-subtle)" : "var(--surface)",
                    }}
                  >
                    <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, fontFamily: "var(--font-heading)", color: active ? "var(--accent)" : "var(--foreground)" }}>{t.label}</span>
                    <span style={{ display: "block", fontSize: 9.5, color: "var(--foreground-muted)", marginTop: 1, lineHeight: 1.35 }}>{t.desc}</span>
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 10.5, color: "var(--foreground-faint)", lineHeight: 1.5, marginBottom: 16 }}>
              Pre-filled from this engagement and saved as a draft under Documents, where you can edit it before sending.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDocFor(null)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
              <button onClick={handleCreateDocument} className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={makingDoc}>
                {makingDoc ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <FileSignature size={13} />}
                {makingDoc ? "Creating..." : "Create Document"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
