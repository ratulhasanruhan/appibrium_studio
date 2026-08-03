"use client";

import React, { useState, useEffect } from "react";
import { Save, Eye, Loader2, Check, PenLine, FileSignature, AlertCircle } from "lucide-react";
import { getClients } from "@/services/crm";
import { createLetter, getLetter, updateLetter, nextReference } from "@/services/letters";
import { SIGNATORIES } from "@/lib/company-profile";
import type { Client, Letter } from "@/types";
import { randomToken } from "@/utils";
import {
  LETTER_TEMPLATES,
  buildLetterBody,
  getTemplate,
  type LetterType,
} from "./letter-templates";

interface LetterEditorProps {
  id?: string;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--foreground-muted)",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export function LetterEditor({ id }: LetterEditorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedToken, setSavedToken] = useState("");
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const [type, setType] = useState<LetterType>("agreement");
  const [title, setTitle] = useState(LETTER_TEMPLATES[0].defaultTitle);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const [showCompanySignature, setShowCompanySignature] = useState(true);
  const [signatoryId, setSignatoryId] = useState(SIGNATORIES[0].id);
  const [requiresSignature, setRequiresSignature] = useState(LETTER_TEMPLATES[0].signByDefault);

  const template = getTemplate(type);
  const signatory = SIGNATORIES.find((s) => s.id === signatoryId) ?? SIGNATORIES[0];

  useEffect(() => {
    getClients().then(setClients);
  }, []);

  useEffect(() => {
    if (!id) return;
    const letterId = id;
    async function load() {
      const l = await getLetter(letterId);
      if (!l) return;
      setType(l.type as LetterType);
      setTitle(l.title);
      setIssueDate(l.issue_date?.slice(0, 10) || issueDate);
      setClientId(l.client_id || "");
      setRecipientName(l.recipient_name || "");
      setRecipientRole(l.recipient_role || "");
      setRecipientAddress(l.recipient_address || "");
      setShowCompanySignature(l.show_company_signature);
      setRequiresSignature(l.requires_signature);
      setSavedToken(l.public_token);
      const match = SIGNATORIES.find((s) => s.name === l.signatory_name);
      if (match) setSignatoryId(match.id);
      if (l.field_values) {
        try { setValues(JSON.parse(l.field_values)); } catch { /* keep empty */ }
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function pickTemplate(next: LetterType) {
    const t = getTemplate(next);
    setType(next);
    setRequiresSignature(t.signByDefault);
    setValues({});
    setTitle(t.defaultTitle);
  }

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }
    setSaving(true);
    setError("");

    const body = buildLetterBody(type, values);
    const payload = {
      client_id: clientId || undefined,
      type,
      title: title.trim(),
      recipient_name: recipientName.trim() || undefined,
      recipient_role: recipientRole.trim() || undefined,
      recipient_address: recipientAddress.trim() || undefined,
      body_html: body,
      field_values: JSON.stringify(values),
      requires_signature: requiresSignature,
      show_company_signature: showCompanySignature,
      signatory_name: showCompanySignature ? signatory.name : undefined,
      signatory_signature: showCompanySignature ? signatory.signature : undefined,
      signatory_title: showCompanySignature ? signatory.title : undefined,
      issue_date: issueDate,
    };

    if (id) {
      const res = await updateLetter(id, payload);
      setSaving(false);
      if (res.success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2200);
      } else setError(res.error || "Failed to save document.");
      return;
    }

    const reference = await nextReference(template.refPrefix);
    const res = await createLetter({
      ...payload,
      reference,
      status: "draft",
      public_token: randomToken("ltr"),
    } as Omit<Letter, "$id" | "$createdAt" | "$updatedAt">);
    setSaving(false);
    if (res.success && res.data) {
      setSavedToken(res.data.public_token);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    } else {
      setError(res.error || "Failed to create document.");
    }
  }

  function handlePreview() {
    if (!savedToken) {
      alert("Save the document first to open the letterhead preview.");
      return;
    }
    window.open(`/public/letter/${savedToken}`, "_blank");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      {/* ─── Left ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Template picker */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Document Type</h3>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>
              Each type has its own fields and standard clauses. Switching resets the fields below.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 8 }}>
            {LETTER_TEMPLATES.map((t) => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  style={{
                    textAlign: "left", cursor: "pointer", padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-subtle)" : "var(--background-alt)",
                    transition: "all 0.12s",
                  }}
                >
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", color: active ? "var(--accent)" : "var(--foreground)" }}>{t.label}</span>
                  <span style={{ display: "block", fontSize: 10, color: "var(--foreground-muted)", marginTop: 2, lineHeight: 1.4 }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document details */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Document Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Title / Subject *</label>
              <input className="input-base" style={{ fontSize: 12 }} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input type="date" className="input-base" style={{ fontSize: 12 }} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Recipient — link a client (optional)</label>
            <select className="input-base" style={{ fontSize: 12 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">No client — internal document</option>
              {clients.map((c) => <option key={c.$id} value={c.$id}>{c.name} — {c.email}</option>)}
            </select>
            <p style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4 }}>
              Linking a client lets them verify by email and sign online. Leave blank for internal or printed documents.
            </p>
          </div>

          {!clientId && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Recipient Name</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="Md. Rahim Uddin" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Recipient Role</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="Frontend Engineer" value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Recipient Address</label>
                <input className="input-base" style={{ fontSize: 12 }} placeholder="City, Country" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Template fields */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{template.label} Content</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {template.fields.map((f) => (
              <div key={f.key} style={f.full || f.type === "textarea" ? { gridColumn: "1/-1" } : undefined}>
                <label style={labelStyle}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="input-base" rows={f.rows ?? 4}
                    style={{ fontSize: 12, resize: "vertical", lineHeight: 1.6 }}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="input-base" type={f.type === "date" ? "date" : "text"}
                    style={{ fontSize: 12 }}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Actions</h3>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#D14F4F", background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "7px 10px", borderRadius: "var(--radius-md)" }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : justSaved ? <Check size={13} /> : <Save size={13} />}
            {saving ? "Saving..." : justSaved ? "Saved!" : id ? "Save Changes" : "Create Document"}
          </button>
          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 12 }} onClick={handlePreview}>
            <Eye size={13} /> Open Letterhead
          </button>
        </div>

        {/* Signature options */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
            <FileSignature size={14} style={{ color: "var(--accent)" }} /> Signatures
          </h3>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={showCompanySignature} onChange={(e) => setShowCompanySignature(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--accent)" }} />
            <span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Add my signature</span>
              <span style={{ display: "block", fontSize: 10.5, color: "var(--foreground-muted)", lineHeight: 1.45 }}>Prints the signature block on the letterhead.</span>
            </span>
          </label>

          {showCompanySignature && (
            <div style={{ paddingLeft: 25 }}>
              <select className="input-base" style={{ fontSize: 12 }} value={signatoryId} onChange={(e) => setSignatoryId(e.target.value)}>
                {SIGNATORIES.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.title}</option>)}
              </select>
              <div style={{ marginTop: 10, padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                <p style={{ fontFamily: "'Alex Brush', cursive", fontSize: 30, color: "#123A26", lineHeight: 1.1 }}>{signatory.signature}</p>
                <div style={{ borderBottom: "1px solid #0D2317", margin: "4px 0 6px" }} />
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{signatory.name}</p>
                <p style={{ fontSize: 10, color: "var(--foreground-muted)" }}>{signatory.title}</p>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "var(--border)" }} />

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--accent)" }} />
            <span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>Recipient must sign</span>
              <span style={{ display: "block", fontSize: 10.5, color: "var(--foreground-muted)", lineHeight: 1.45 }}>
                Adds a counter-signature block and lets a linked client sign online, like a proposal.
              </span>
            </span>
          </label>

          {requiresSignature && !clientId && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 10.5, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "8px 10px", borderRadius: "var(--radius-md)" }}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              No client linked — the document will show a blank signature line for wet-ink signing instead of online signing.
            </div>
          )}
        </div>

        <div className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <PenLine size={14} style={{ color: "var(--foreground-muted)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground-2)" }}>About letterheads</h4>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginTop: 4 }}>
              Company details come from Settings. Every document gets a secure public link, renders as A4, and downloads as PDF.
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
