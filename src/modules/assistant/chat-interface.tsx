"use client";

import { useState } from "react";
import { Bot, Send, User, Loader2, Sparkles, Copy, Trash2, Check } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "<h2>Hello!</h2><p>I am your Appibrium Studio AI copilot. Ask me to outline proposal scopes, write contract terms, generate budget milestones, or design email copy for client outreach.</p>" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: `<p>${userPrompt}</p>` }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.result }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `<p style="color: #D14F4F;"><strong>Error:</strong> ${err.message || "Failed to generate response."}</p>` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(content: string, index: number) {
    navigator.clipboard.writeText(content);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function clearChat() {
    if (confirm("Clear all messages?")) {
      setMessages([
        { role: "assistant", content: "<h2>Chat Cleared</h2><p>Ask me something new to get started!</p>" }
      ]);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, height: "calc(100vh - 120px)", minHeight: 480 }}>
      {/* Left Chat Workspace */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {m.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={14} />
                </div>
              )}
              <div
                style={{
                  maxWidth: "75%",
                  background: m.role === "user" ? "var(--accent)" : "var(--surface)",
                  color: m.role === "user" ? "white" : "var(--foreground)",
                  padding: "12px 16px", borderRadius: "var(--radius-lg)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)",
                  fontSize: 13, lineHeight: 1.6, position: "relative",
                }}
              >
                {/* Assistant HTML display */}
                {m.role === "assistant" ? (
                  <div className="chat-html" dangerouslySetInnerHTML={{ __html: m.content }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: m.content }} />
                )}

                {/* Actions overlay for Assistant replies */}
                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, idx)}
                    style={{
                      position: "absolute", top: 8, right: 8, background: "var(--background-alt)",
                      border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                      padding: 4, cursor: "pointer", color: "var(--foreground-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title="Copy Raw Content"
                  >
                    {copiedId === idx ? <Check size={11} style={{ color: "var(--accent)" }} /> : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bot size={14} />
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
                <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Qwen AI is drafting...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", background: "var(--background-alt)", display: "flex", gap: 8 }}>
          <input
            className="input-base"
            placeholder="Ask Qwen AI to draft templates or review copy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "8px 14px" }} disabled={loading || !input.trim()}>
            <Send size={13} />
          </button>
        </form>
      </div>

      {/* Right Sidebar: AI Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Quick Prompts */}
        <div className="card">
          <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)", marginBottom: 12 }}>Quick Prompts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Draft web development proposal overview",
              "Write 50/30/20 payment term text",
              "Write client thank you outreach message",
              "Outline standard system support SLA",
            ].map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                style={{
                  textAlign: "left", padding: "8px 10px", fontSize: 11, background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer",
                  color: "var(--foreground-muted)", transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground-muted)"; }}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="card" style={{ borderColor: "rgba(0,184,114,0.15)", background: "linear-gradient(135deg, #F0FBF5, var(--background-alt))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Qwen Copilot</h3>
          </div>
          <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.6 }}>
            Generated outputs can be copied directly as clean HTML blocks to insert directly inside proposal editors.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={clearChat} style={{ color: "#D14F4F", justifyContent: "center", fontSize: 12, padding: "8px" }}>
          <Trash2 size={13} /> Clear Conversation
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .chat-html h2 { font-size: 14px; font-weight: 700; color: var(--foreground); margin-top: 10px; margin-bottom: 6px; }
        .chat-html p { margin-bottom: 8px; }
        .chat-html ul { padding-left: 18px; margin-bottom: 8px; }
        .chat-html li { margin-bottom: 3px; }
      `}</style>
    </div>
  );
}
