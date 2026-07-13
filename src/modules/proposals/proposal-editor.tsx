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
import { createProposal } from "@/services/proposals";
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

  useEffect(() => {
    async function loadClients() {
      const list = await getClients();
      setClients(list);
    }
    loadClients();
  }, []);

  async function handleSave() {
    if (!selectedClientId || !title) {
      alert("Please select a client and enter a title.");
      return;
    }
    setSaving(true);
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
    if (result.success) {
      alert("Proposal saved successfully!");
    } else {
      alert("Error: " + result.error);
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
    // Simulate SMS gateway call
    const res = await sendProposalSMS(
      client.phone,
      id ?? "PROP-TEMP-1",
      "preview_tok_99",
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
      {/* ─── Left Panel: Editor ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
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
