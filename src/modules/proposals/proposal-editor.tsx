"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  Send,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  FileText,
  Clock,
  Eye,
  Settings,
  Bot,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getClient, getClients } from "@/services/crm";
import { createProposal, getProposal, updateProposal } from "@/services/proposals";
import { sendProposalSMS } from "@/services/sms";
import type { Client, Proposal } from "@/types";
import { fmt, formatDate } from "@/utils";

interface ProposalEditorProps {
  id?: string; // If undefined, we are in "Create" mode
}

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

  // Template Generator state
  const [showTemplates, setShowTemplates] = useState(false);
  const [projDesc, setProjDesc] = useState("");
  const [projTech, setProjTech] = useState("");
  const [projDuration, setProjDuration] = useState("");
  const [projAmount, setProjAmount] = useState("");

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
      }
    } catch (error: any) {
      console.error(error);
      alert("AI Assistant error: " + error.message);
    } finally {
      setAiGenerating(false);
      setAiPrompt("");
    }
  }

  function handleGenerateTemplate(type: "web" | "app") {
    if (!projDesc || !projTech || !projDuration || !projAmount) {
      alert("Please fill in all template fields: Description, Technologies, Duration, and Amount.");
      return;
    }

    const titlePrefix = type === "web" ? "Web Application Development" : "Mobile App Development";
    if (!title) {
      setTitle(`${titlePrefix} Proposal`);
    }

    const htmlContent = type === "web" ? `
<h2>1. Executive Summary</h2>
<p>${projDesc}. By leveraging modern software engineering practices, we will deliver a scalable, secure, and visually stunning web application tailored specifically to your organizational workflows.</p>


<h2>2. Core Technical Architecture</h2>
<p>The platform will be engineered using state-of-the-art web technologies chosen for peak performance, security, and developer velocity:</p>
<ul>
  <li><strong>Frontend & Client Interface</strong>: Built with <strong>${projTech}</strong> to achieve seamless page transitions, fast loading speeds, and responsive behaviors.</li>
  <li><strong>Backend Services</strong>: Appwrite Cloud powers the secure database collection schema, file storage bucket, and user session authentication.</li>
</ul>


<h2>3. Project Scope & Key Deliverables</h2>
<ul>
  <li><strong>Phase 1: Prototype Layout & Database Setup</strong> — Design layout wireframes, synchronize database collections, and establish secure client connections.</li>
  <li><strong>Phase 2: Business Logic & Portal Pages</strong> — Develop custom workspace interfaces, line-item builders, PDF generation routes, and communication integrations.</li>
  <li><strong>Phase 3: Security & Verification Testing</strong> — Implement client authorization guards, audit checks, and perform staging deployments.</li>
</ul>


<h2>4. Timeline & Deliverables</h2>
<p>The overall project timeline is estimated to span <strong>${projDuration}</strong>. Delivery will be structured into bi-weekly milestones with live previews.</p>


<h2>5. Commercial Terms & Pricing</h2>
<p>The total investment for the complete software engineering lifecycle is structured as follows:</p>
<ul>
  <li><strong>Total Project Budget</strong>: <strong>${projAmount} BDT</strong></li>
  <li><strong>Payment Schedule</strong>:
    <ul>
      <li>20% Advance initiation deposit.</li>
      <li>30% Mid-milestone prototype delivery.</li>
      <li>50% Final verification and deployment handover.</li>
    </ul>
  </li>
</ul>
    ` : `
<h2>1. Executive Summary</h2>
<p>${projDesc}. We will build a native-feeling mobile application providing a premium, fluid user interface and highly optimised offline synchronization behaviors.</p>
 
<h2>2. Mobile Application Architecture</h2>
<p>The application will be engineered using modern cross-platform patterns for native execution across iOS and Android systems:</p>
<ul>
  <li><strong>App Framework</strong>: Built using <strong>${projTech}</strong> for smooth micro-animations and peak native performance.</li>
  <li><strong>Cloud Sync Backend</strong>: Powered by Appwrite Databases and storage services.</li>
</ul>
 
<h2>3. Project Scope & Milestones</h2>
<ul>
  <li><strong>Phase 1: UI/UX Wireframing & Appwrite Client Integration</strong> — Custom screen designs, authentication session setup, and collections initialization.</li>
  <li><strong>Phase 2: Feature Development & Push Notifications</strong> — Interactive client workspace screens, background notifications integration, and payment details integration.</li>
  <li><strong>Phase 3: App Store Deployment & Handover</strong> — App Store (iOS) and Google Play Store (Android) release preparation.</li>
</ul>
 
<h2>4. Timeline & Milestones</h2>
<p>The project lifecycle will span a duration of <strong>${projDuration}</strong> from initial kickoff to deployment.</p>
 
<h2>5. Project Budget & Pricing</h2>
<ul>
  <li><strong>Total Mobile App Budget</strong>: <strong>${projAmount} BDT</strong></li>
  <li><strong>Milestone Payments</strong>:
    <ul>
      <li>20% Advance initiation deposit.</li>
      <li>30% Beta release testing preview.</li>
      <li>50% Store publication and final approval.</li>
    </ul>
  </li>
</ul>
    `;

    setContentHtml(htmlContent.trim());
    setShowTemplates(false);
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
      // Edit mode: Update existing proposal
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
      // Create mode
      const token = "tok_" + Math.random().toString(36).substring(2, 10);
      const result = await createProposal({
        client_id: selectedClientId,
        title,
        content_html: contentHtml,
        status: "draft",
        public_token: token,
        version: 1,
        currency: "BDT",
      });
      setSaving(false);
      if (result.success && result.data) {
        setPublicToken(result.data.public_token);
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
    if (res.success) {
      setSmsStatus("SMS Sent!");
      setTimeout(() => setSmsStatus(""), 3000);
    } else {
      setSmsStatus("Failed to send.");
      setTimeout(() => setSmsStatus(""), 3000);
    }
  }

  function handlePreview() {
    if (!publicToken) {
      alert("Please save the proposal first to enable live preview.");
      return;
    }
    window.open(`/public/proposal/${publicToken}`, "_blank");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      {/* ─── Left Panel: Editor ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Template Copilot Card */}
        <div className="card" style={{ border: "1px solid rgba(0, 184, 114, 0.2)", background: "linear-gradient(135deg, #F0FBF5, var(--background-alt))", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>⚡ Proposal Template Copilot</h3>
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ fontSize: 11, padding: "4px 8px", background: "var(--background)", border: "1px solid var(--border)" }} 
              onClick={() => setShowTemplates(!showTemplates)}
            >
              {showTemplates ? "Hide Generator" : "Use Template Generator"}
            </button>
          </div>

          {showTemplates && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px dashed var(--border)", paddingTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Technologies Used</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="e.g. Next.js, Appwrite, CSS"
                    value={projTech}
                    onChange={(e) => setProjTech(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Duration / Timeline</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="e.g. 2 Months"
                    value={projDuration}
                    onChange={(e) => setProjDuration(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Project Budget Amount (BDT)</label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="e.g. 1,50,000"
                    value={projAmount}
                    onChange={(e) => setProjAmount(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Project Description & Goal</label>
                <textarea
                  className="input-base"
                  rows={2}
                  placeholder="e.g. Design and engineer a custom client workflow CRM platform for Appibrium Studio"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  style={{ fontSize: 12, resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, justifyContent: "center", fontSize: 12 }} 
                  onClick={() => handleGenerateTemplate("web")}
                >
                  Create Web Application Proposal
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1, justifyContent: "center", fontSize: 12, border: "1px solid var(--border)", background: "var(--background)" }} 
                  onClick={() => handleGenerateTemplate("app")}
                >
                  Create Mobile App Proposal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Editor Settings Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Proposal Settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client *</label>
              <select className="input-base" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.$id} value={c.$id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Proposal Title *</label>
              <input className="input-base" placeholder="e.g. Website Development Contract" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
        </div>

        {/* HTML Editor */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 400 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Proposal Content</h2>
            <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Supports standard HTML editing</span>
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
              minHeight: 350,
            }}
            placeholder="<h1>Project Title</h1><p>Start writing your proposal content here...</p>"
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Right Sidebar: AI Sidekick & Action Panel ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Actions Card */}
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

        {/* AI Co-Pilot (Qwen Coder) */}
        <div className="card" style={{ border: "1px solid rgba(0, 184, 114, 0.2)", background: "linear-gradient(135deg, #F0FBF5, var(--background-alt))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Bot size={16} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Qwen AI Assistant</h3>
          </div>
          <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Ask the AI Assistant to generate specific clauses, outline scopes of work, or draft terms.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              className="input-base"
              rows={3}
              placeholder="e.g. Generate software development commercial terms in BDT..."
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

        {/* Quick Tips */}
        <div className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle size={14} style={{ color: "var(--foreground-muted)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground-2)" }}>Proposals Guide</h4>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5, marginTop: 4 }}>
              Clients can view proposals via a public, secure, tokenized URL, without needing an account. From there, they can review, download PDF, or hit Accept.
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
