"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  MessageSquare,
  Sparkles,
  Eye,
  Bot,
  AlertCircle,
  Loader2,
  Check,
  Plus,
  Trash2,
  LayoutTemplate,
  Code2,
  Wand2,
} from "lucide-react";
import { getClients } from "@/services/crm";
import { createProposal, getProposal, updateProposal } from "@/services/proposals";
import { sendProposalNotification } from "@/services/email";
import { sendProposalSMS } from "@/services/sms";
import type { Client } from "@/types";
import { COMPANY_WORKS } from "@/lib/company-profile";
import {
  BLOCKS,
  BLOCK_GROUPS,
  PRESETS,
  buildProposalHtml,
  type BlockId,
  type Phase,
  type PriceItem,
  type ProposalInput,
} from "./proposal-blocks";

interface ProposalEditorProps {
  id?: string; // If undefined, we are in "Create" mode
}

const emptyPhase = (): Phase => ({ name: "", duration: "", detail: "" });
const emptyPrice = (): PriceItem => ({ label: "", detail: "", amount: "" });

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--foreground-muted)",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export function ProposalEditor({ id }: ProposalEditorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState("");
  const [publicToken, setPublicToken] = useState("");

  // Builder state
  const [tab, setTab] = useState<"builder" | "html">("builder");
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [blocks, setBlocks] = useState<BlockId[]>(PRESETS[0].blocks);
  const [generated, setGenerated] = useState(false);

  const [input, setInput] = useState<ProposalInput>({
    clientName: "",
    desc: "",
    tech: "",
    duration: "",
    amount: "",
    currency: "BDT",
    deliverables: PRESETS[0].deliverables,
    phases: PRESETS[0].phases,
    featuredWork: COMPANY_WORKS.map((w) => w.id),
    priceItems: [emptyPrice(), emptyPrice()],
    supportMonths: "3",
    validDays: "30",
    contactEmail: "hello@appibrium.com",
  });

  function patch(next: Partial<ProposalInput>) {
    setInput((prev) => ({ ...prev, ...next }));
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setBlocks(preset.blocks);
    patch({ phases: preset.phases.map((p) => ({ ...p })), deliverables: preset.deliverables });
    if (!title) setTitle(`${preset.label} Proposal`);
  }

  function toggleBlock(blockId: BlockId) {
    setBlocks((prev) =>
      prev.includes(blockId) ? prev.filter((b) => b !== blockId) : [...prev, blockId]
    );
  }

  function handleGenerate() {
    const client = clients.find((c) => c.$id === selectedClientId);
    const html = buildProposalHtml(blocks, {
      ...input,
      clientName: client?.name || input.clientName,
    });
    if (!html.trim()) {
      alert("Nothing to generate — select at least one section.");
      return;
    }
    // Regenerating replaces the editor content wholesale, so don't silently
    // discard hand-written or previously saved HTML.
    if (
      contentHtml.trim() &&
      contentHtml.trim() !== html.trim() &&
      !confirm("This replaces the current proposal content, including any manual edits. Continue?")
    ) {
      return;
    }
    setContentHtml(html);
    setGenerated(true);
    setTab("html");
    setTimeout(() => setGenerated(false), 2500);
  }

  async function handleAiGenerate() {
    if (!aiPrompt) return;
    setAiGenerating(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content.");
      }
      if (data.result) {
        setContentHtml((prev) => prev + "\n" + data.result);
        setTab("html");
      }
    } catch (error) {
      console.error(error);
      alert("AI Assistant error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setAiGenerating(false);
      setAiPrompt("");
    }
  }

  useEffect(() => {
    async function loadClients() {
      const list = await getClients();
      setClients(list);
    }
    loadClients();
  }, []);

  useEffect(() => {
    if (!id) return;
    const proposalId = id;
    async function loadProposal() {
      const p = await getProposal(proposalId);
      if (p) {
        setTitle(p.title);
        setSelectedClientId(p.client_id);
        setContentHtml(p.content_html || "");
        setPublicToken(p.public_token);
        setTab("html");
      }
    }
    loadProposal();
  }, [id]);

  async function handleSave() {
    if (!selectedClientId || !title) {
      alert("Please select a client and enter a title.");
      return;
    }
    setSaving(true);

    if (id) {
      const result = await updateProposal(id, {
        client_id: selectedClientId,
        title,
        content_html: contentHtml,
      });
      setSaving(false);
      if (result.success) {
        alert("Proposal updated successfully!");
      } else {
        alert("Error: " + result.error);
      }
    } else {
      const token = "tok_" + Math.random().toString(36).substring(2, 10);
      const result = await createProposal({
        client_id: selectedClientId,
        title,
        content_html: contentHtml,
        status: "draft",
        public_token: token,
        version: 1,
        currency: input.currency,
      });
      setSaving(false);
      if (result.success && result.data) {
        setPublicToken(result.data.public_token);
        try {
          const selectedCli = clients.find((c) => c.$id === selectedClientId);
          if (selectedCli && selectedCli.email) {
            await sendProposalNotification(selectedCli.email, selectedCli.name, title, token);
          }
        } catch (emailErr) {
          console.error("Failed to send proposal notification email:", emailErr);
        }
        alert("Proposal saved successfully!");
      } else {
        alert("Error: " + result.error);
      }
    }
  }

  async function handleSendSMS() {
    if (!selectedClientId) {
      alert("Please select a client first.");
      return;
    }
    const client = clients.find((c) => c.$id === selectedClientId);
    if (!client || !client.phone) {
      alert("Selected client does not have a phone number.");
      return;
    }

    setSmsSending(true);
    setSmsStatus("Sending...");
    const res = await sendProposalSMS(
      client.phone,
      id ?? "PROP-TEMP-1",
      publicToken || "preview_tok_99",
      client.name
    );
    setSmsSending(false);
    setSmsStatus(res.success ? "SMS Sent!" : "Failed to send.");
    setTimeout(() => setSmsStatus(""), 3000);
  }

  function handlePreview() {
    if (!publicToken) {
      alert("Please save the proposal first to enable live preview.");
      return;
    }
    window.open(`/public/proposal/${publicToken}`, "_blank");
  }

  const activeCount = blocks.length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      {/* ─── Left Panel ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Proposal Settings */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Proposal Settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Client *</label>
              <select className="input-base" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.$id} value={c.$id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Proposal Title *</label>
              <input className="input-base" placeholder="e.g. Website Development Contract" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 3 }}>
          {([
            { k: "builder", label: "Template Builder", icon: LayoutTemplate },
            { k: "html", label: "HTML Content", icon: Code2 },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                border: "none", cursor: "pointer", padding: "7px 0", borderRadius: "var(--radius-sm)",
                background: tab === k ? "var(--background-alt)" : "transparent",
                color: tab === k ? "var(--foreground)" : "var(--foreground-muted)",
                fontSize: 12, fontWeight: tab === k ? 600 : 500,
                boxShadow: tab === k ? "var(--shadow-xs)" : "none",
                fontFamily: "var(--font-body)",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {tab === "builder" ? (
          <>
            {/* Preset picker */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Start From a Template</h3>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>Picks a recommended set of sections — you can adjust everything below.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {PRESETS.map((p) => {
                  const active = presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      style={{
                        textAlign: "left", cursor: "pointer", padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-subtle)" : "var(--background-alt)",
                        transition: "all 0.12s",
                      }}
                    >
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: active ? "var(--accent)" : "var(--foreground)", fontFamily: "var(--font-heading)" }}>{p.label}</span>
                      <span style={{ display: "block", fontSize: 10, color: "var(--foreground-muted)", marginTop: 2, lineHeight: 1.4 }}>{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section picker */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Sections</h3>
                  <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>{activeCount} of {BLOCKS.length} selected — click to toggle.</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setBlocks(BLOCKS.map((b) => b.id))}>All</button>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setBlocks([])}>None</button>
                </div>
              </div>

              {BLOCK_GROUPS.map((group) => (
                <div key={group}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>{group}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 7 }}>
                    {BLOCKS.filter((b) => b.group === group).map((b) => {
                      const on = blocks.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          onClick={() => toggleBlock(b.id)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
                            padding: "8px 10px", cursor: "pointer",
                            borderRadius: "var(--radius-md)",
                            border: `1px solid ${on ? "rgba(0,184,114,0.35)" : "var(--border)"}`,
                            background: on ? "var(--accent-subtle)" : "var(--background-alt)",
                            transition: "all 0.12s",
                          }}
                        >
                          <span
                            style={{
                              width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
                              border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong, var(--border))"}`,
                              background: on ? "var(--accent)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff",
                            }}
                          >
                            {on && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span>
                            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{b.label}</span>
                            <span style={{ display: "block", fontSize: 10, color: "var(--foreground-muted)", marginTop: 1, lineHeight: 1.35 }}>{b.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Project brief */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Project Brief</h3>
              <div>
                <label style={labelStyle}>Project Description & Goal</label>
                <textarea
                  className="input-base" rows={2} style={{ fontSize: 12, resize: "none" }}
                  placeholder="e.g. Design and engineer a custom client workflow platform that replaces manual spreadsheet tracking"
                  value={input.desc} onChange={(e) => patch({ desc: e.target.value })}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Technologies</label>
                  <input className="input-base" style={{ fontSize: 12 }} placeholder="Next.js, Appwrite" value={input.tech} onChange={(e) => patch({ tech: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <input className="input-base" style={{ fontSize: 12 }} placeholder="8 weeks" value={input.duration} onChange={(e) => patch({ duration: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Total Budget</label>
                  <input className="input-base" style={{ fontSize: 12 }} placeholder="150,000" value={input.amount} onChange={(e) => patch({ amount: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select className="input-base" style={{ fontSize: 12 }} value={input.currency} onChange={(e) => patch({ currency: e.target.value })}>
                    {["BDT", "USD", "EUR", "GBP", "INR"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Support (months)</label>
                  <input className="input-base" style={{ fontSize: 12 }} value={input.supportMonths} onChange={(e) => patch({ supportMonths: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Valid For (days)</label>
                  <input className="input-base" style={{ fontSize: 12 }} value={input.validDays} onChange={(e) => patch({ validDays: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Deliverables — one per line</label>
                <textarea
                  className="input-base" rows={5} style={{ fontSize: 12, resize: "vertical", lineHeight: 1.6 }}
                  placeholder={"Responsive web application\nSecure authentication\nAdmin dashboard"}
                  value={input.deliverables} onChange={(e) => patch({ deliverables: e.target.value })}
                />
              </div>
            </div>

            {/* Timeline phases */}
            {blocks.includes("timeline") && (
              <RepeatCard
                title="Timeline Phases"
                subtitle="Each phase renders as a numbered step in the proposal."
                onAdd={() => patch({ phases: [...input.phases, emptyPhase()] })}
                rows={input.phases}
                onRemove={(idx) => patch({ phases: input.phases.filter((_, i) => i !== idx) })}
                render={(row, idx) => (
                  <>
                    <input className="input-base" style={{ fontSize: 12, flex: "1 1 160px" }} placeholder="Phase name" value={row.name}
                      onChange={(e) => patch({ phases: input.phases.map((p, i) => i === idx ? { ...p, name: e.target.value } : p) })} />
                    <input className="input-base" style={{ fontSize: 12, flex: "0 1 110px" }} placeholder="Week 1–2" value={row.duration}
                      onChange={(e) => patch({ phases: input.phases.map((p, i) => i === idx ? { ...p, duration: e.target.value } : p) })} />
                    <input className="input-base" style={{ fontSize: 12, flex: "2 1 220px" }} placeholder="What happens in this phase" value={row.detail}
                      onChange={(e) => patch({ phases: input.phases.map((p, i) => i === idx ? { ...p, detail: e.target.value } : p) })} />
                  </>
                )}
              />
            )}

            {/* Portfolio picker — sourced from the shared company profile */}
            {blocks.includes("work") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Featured Projects</h3>
                    <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>
                      From your company profile — all included by default. Untick any that aren&apos;t relevant to this client.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => patch({ featuredWork: COMPANY_WORKS.map((w) => w.id) })}>All</button>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => patch({ featuredWork: [] })}>None</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))", gap: 7 }}>
                  {COMPANY_WORKS.map((w) => {
                    const on = input.featuredWork.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        onClick={() =>
                          patch({
                            featuredWork: on
                              ? input.featuredWork.filter((x) => x !== w.id)
                              : [...input.featuredWork, w.id],
                          })
                        }
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
                          padding: "8px 10px", cursor: "pointer",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${on ? "rgba(0,184,114,0.35)" : "var(--border)"}`,
                          background: on ? "var(--accent-subtle)" : "var(--background-alt)",
                          transition: "all 0.12s",
                        }}
                      >
                        <span
                          style={{
                            width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 6,
                            border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                            background: on ? "var(--accent)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                          }}
                        >
                          {on && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span
                          style={{
                            width: 28, height: 28, flexShrink: 0, padding: 3,
                            borderRadius: 7, background: "#fff",
                            border: "1px solid var(--border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: on ? 1 : 0.5,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.image} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{w.title}</span>
                          <span style={{ display: "block", fontSize: 10, color: "var(--foreground-muted)", marginTop: 1 }}>{w.category}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 10, color: "var(--foreground-faint)" }}>
                  Edit the project list once in <code>src/lib/company-profile.ts</code> — every future proposal picks it up automatically.
                </p>
              </div>
            )}

            {/* Pricing */}
            {blocks.includes("pricing") && (
              <RepeatCard
                title="Investment Line Items"
                subtitle="Itemised breakdown. The total above is shown as the headline figure."
                onAdd={() => patch({ priceItems: [...input.priceItems, emptyPrice()] })}
                rows={input.priceItems}
                onRemove={(idx) => patch({ priceItems: input.priceItems.filter((_, i) => i !== idx) })}
                render={(row, idx) => {
                  const set = (k: keyof PriceItem, v: string) =>
                    patch({ priceItems: input.priceItems.map((p, i) => i === idx ? { ...p, [k]: v } : p) });
                  return (
                    <>
                      <input className="input-base" style={{ fontSize: 12, flex: "1 1 150px" }} placeholder="Item, e.g. Design & UX" value={row.label} onChange={(e) => set("label", e.target.value)} />
                      <input className="input-base" style={{ fontSize: 12, flex: "2 1 200px" }} placeholder="Short detail (optional)" value={row.detail} onChange={(e) => set("detail", e.target.value)} />
                      <input className="input-base" style={{ fontSize: 12, flex: "0 1 120px" }} placeholder="40,000" value={row.amount} onChange={(e) => set("amount", e.target.value)} />
                    </>
                  );
                }}
              />
            )}

            {/* Generate */}
            <button
              className="btn btn-primary"
              style={{ justifyContent: "center", padding: "11px", fontSize: 13 }}
              onClick={handleGenerate}
            >
              {generated ? <><Check size={14} /> Proposal Generated</> : <><Wand2 size={14} /> Generate Proposal Content</>}
            </button>
          </>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Proposal Content</h2>
              <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Generated HTML — edit freely before sending</span>
            </div>
            <textarea
              className="input-base"
              style={{
                flex: 1,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                lineHeight: 1.6,
                background: "var(--background-alt)",
                resize: "none",
                minHeight: 460,
              }}
              placeholder="<h2>Project Overview</h2><p>Build sections in the Template Builder, or write your own HTML here...</p>"
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ─── Right Sidebar ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Publish Actions</h2>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            Save Proposal
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={handleSendSMS} disabled={smsSending}>
              <MessageSquare size={13} />
              {smsStatus || "Send SMS"}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={handlePreview}>
              <Eye size={13} />
              Preview
            </button>
          </div>
        </div>

        {/* AI Co-Pilot */}
        <div className="card" style={{ border: "1px solid rgba(0, 184, 114, 0.2)", background: "linear-gradient(135deg, #F0FBF5, var(--background-alt))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Bot size={16} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Qwen AI Assistant</h3>
          </div>
          <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Generate extra clauses or rewrite a section. Output is appended to the HTML content.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              className="input-base"
              rows={3}
              placeholder="e.g. Write a data migration section for this proposal..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              style={{ fontSize: 12, resize: "none" }}
            />
            <button className="btn btn-primary" style={{ justifyContent: "center", fontSize: 12 }} onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt}>
              {aiGenerating ? (
                <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
              ) : (
                <><Sparkles size={13} /> Draft with Qwen AI</>
              )}
            </button>
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle size={14} style={{ color: "var(--foreground-muted)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground-2)" }}>Proposals Guide</h4>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginTop: 4 }}>
              Clients view proposals via a secure tokenized URL without an account. From there they can review, download a PDF, or accept and sign.
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Repeatable row editor ──────────────────────────────────────────────── //

function RepeatCard<T>({
  title,
  subtitle,
  rows,
  render,
  onAdd,
  onRemove,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  render: (row: T, idx: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{title}</h3>
          <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>{subtitle}</p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={onAdd}>
          <Plus size={12} /> Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 11, color: "var(--foreground-faint)", padding: "6px 0" }}>None added yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center",
                padding: 10, borderRadius: "var(--radius-md)",
                background: "var(--surface)", border: "1px solid var(--border)",
              }}
            >
              {render(row, idx)}
              <button
                onClick={() => onRemove(idx)}
                title="Remove"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-faint)", padding: 4, marginLeft: "auto" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
