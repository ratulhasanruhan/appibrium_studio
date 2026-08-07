"use client";

import { useState, useEffect } from "react";
import {
  Mail, MessageSquare, History, Loader2, AlertCircle, ArrowLeft,
  Search, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { account } from "@/lib/appwrite/client";
import { authHeader } from "@/lib/auth-client";
import { hasAdminRole, formatRelativeTime, formatDate } from "@/utils";
import { getSmsLogs } from "@/services/sms-logs";
import { getClients } from "@/services/crm";
import { getProjects } from "@/services/projects";
import { getProposals } from "@/services/proposals";
import { getInvoices } from "@/services/invoices";
import { getLetters } from "@/services/letters";
import { getTransactions } from "@/services/transactions";
import { getEngagements } from "@/services/engagements";
import { getPeople } from "@/services/people";
import { buildActivityFeed, type ActivityEvent } from "@/lib/activity";
import type { SmsLog, EmailLog } from "@/types";

type Tab = "activity" | "email" | "sms";

const TABS: { id: Tab; label: string; icon: typeof Mail }[] = [
  { id: "activity", label: "Activity", icon: History },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
];

/**
 * Resend reports the last thing that happened to a message. Only delivery is
 * unambiguously good; bounces and complaints need to stand out, and anything
 * still in flight should not be dressed up as success.
 */
const EMAIL_TONE: Record<string, { color: string; bg: string }> = {
  delivered:      { color: "#00965C", bg: "rgba(0,184,114,0.12)" },
  sent:           { color: "#3B72D4", bg: "rgba(59,114,212,0.12)" },
  queued:         { color: "#6B8F7C", bg: "rgba(107,143,124,0.14)" },
  scheduled:      { color: "#6B8F7C", bg: "rgba(107,143,124,0.14)" },
  opened:         { color: "#00965C", bg: "rgba(0,184,114,0.12)" },
  clicked:        { color: "#00965C", bg: "rgba(0,184,114,0.12)" },
  bounced:        { color: "#D14F4F", bg: "rgba(209,79,79,0.12)" },
  complained:     { color: "#B45309", bg: "rgba(180,83,9,0.12)" },
  delivery_delayed: { color: "#B45309", bg: "rgba(180,83,9,0.12)" },
  failed:         { color: "#D14F4F", bg: "rgba(209,79,79,0.12)" },
};

const TONE_COLOR: Record<ActivityEvent["tone"], string> = {
  "money-in": "#00965C",
  "money-out": "#D14F4F",
  agreement: "#3B72D4",
  neutral: "var(--foreground-faint)",
};

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
      borderRadius: 99, fontSize: 10.5, fontWeight: 600, color, background: bg,
      textTransform: "capitalize", whiteSpace: "nowrap",
    }}>{text.replace(/_/g, " ")}</span>
  );
}

export function LogsView() {
  const [tab, setTab] = useState<Tab>("activity");
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [emailError, setEmailError] = useState("");
  const [sms, setSms] = useState<SmsLog[]>([]);

  async function loadAll() {
    const [clients, projects, proposals, invoices, letters, transactions, engagements, people] =
      await Promise.all([
        getClients(), getProjects(), getProposals(), getInvoices(),
        getLetters(), getTransactions(), getEngagements(), getPeople(),
      ]);
    setActivity(buildActivityFeed({
      clients, projects, proposals, invoices, letters, transactions, engagements, people,
    }));

    setSms(await getSmsLogs(100));

    try {
      const res = await fetch("/api/logs?limit=100", { headers: await authHeader() });
      const data = await res.json();
      setEmails(data.emails ?? []);
      setEmailError(data.error ?? "");
    } catch (err) {
      console.error("[Logs] email log failed:", err);
      setEmailError("Could not load the email log.");
    }
  }

  useEffect(() => {
    async function boot() {
      const user = await account.get().catch(() => null);
      if (!user || !hasAdminRole(user.labels || [])) {
        setDenied(true); setChecking(false); setLoading(false);
        return;
      }
      setChecking(false);
      try { await loadAll(); } catch (err) { console.error("[Logs] load error:", err); }
      setLoading(false);
    }
    boot();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadAll(); } catch (err) { console.error("[Logs] refresh error:", err); }
    setRefreshing(false);
  }

  if (checking || loading) {
    return (
      <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, color: "var(--foreground-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13 }}>Loading logs...</span>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="card" style={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={30} style={{ color: "#B45309" }} />
        <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>Logs are available to administrators only.</p>
        <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: 12 }}>
          <ArrowLeft size={13} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const shownActivity = q
    ? activity.filter((e) => (e.title + " " + e.detail).toLowerCase().includes(q))
    : activity;
  const shownEmails = q
    ? emails.filter((e) => (e.subject + " " + e.to.join(" ")).toLowerCase().includes(q))
    : emails;
  const shownSms = q
    ? sms.filter((s) => (s.to + " " + s.message + " " + s.entity_type).toLowerCase().includes(q))
    : sms;

  const counts: Record<Tab, number> = {
    activity: shownActivity.length, email: shownEmails.length, sms: shownSms.length,
  };

  return (
    <div>
      <div className="logs-toolbar">
        <div className="logs-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`logs-tab ${tab === id ? "is-active" : ""}`}
            >
              <Icon size={13} /> {label}
              <span className="logs-count">{counts[id]}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <div style={{ position: "relative", width: 240 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
            <input
              className="input-base" placeholder="Search logs..." value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: 12 }}
            />
          </div>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ fontSize: 12 }}>
            <RefreshCw size={13} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Activity ─── */}
      {tab === "activity" && (
        <div className="card" style={{ padding: 0 }}>
          {shownActivity.length === 0 ? (
            <p className="logs-empty">Nothing recorded yet.</p>
          ) : (
            <ul className="feed">
              {shownActivity.map((e, i) => (
                <li key={`${e.at}-${i}`} className="feed-row">
                  <span className="feed-dot" style={{ background: TONE_COLOR[e.tone] }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="feed-title">
                      {e.href ? <Link href={e.href} className="feed-link">{e.title}</Link> : e.title}
                    </p>
                    <p className="feed-detail">{e.detail}</p>
                  </div>
                  <time className="feed-time" suppressHydrationWarning title={formatDate(e.at)}>
                    {formatRelativeTime(e.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ─── Email ─── */}
      {tab === "email" && (
        <div className="card" style={{ padding: 0 }}>
          {emailError && (
            <p className="logs-note"><AlertCircle size={12} /> {emailError}</p>
          )}
          {shownEmails.length === 0 && !emailError ? (
            <p className="logs-empty">No email has been sent yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="logs-table">
                <thead>
                  <tr><th>Subject</th><th>Recipient</th><th>Status</th><th>Sent</th></tr>
                </thead>
                <tbody>
                  {shownEmails.map((e) => {
                    const tone = EMAIL_TONE[e.last_event] ?? { color: "var(--foreground-muted)", bg: "rgba(107,143,124,0.14)" };
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 500, color: "var(--foreground)" }}>{e.subject || "(no subject)"}</td>
                        <td style={{ color: "var(--foreground-muted)" }}>{e.to.join(", ")}</td>
                        <td><Pill text={e.last_event} color={tone.color} bg={tone.bg} /></td>
                        <td suppressHydrationWarning style={{ color: "var(--foreground-muted)", whiteSpace: "nowrap" }}>
                          {e.created_at ? formatRelativeTime(e.created_at) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── SMS ─── */}
      {tab === "sms" && (
        <div className="card" style={{ padding: 0 }}>
          {shownSms.length === 0 ? (
            <p className="logs-empty">
              No SMS recorded yet. Messages sent from now on will appear here, delivered or not.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="logs-table">
                <thead>
                  <tr><th>Message</th><th>To</th><th>About</th><th>Status</th><th>Sent</th></tr>
                </thead>
                <tbody>
                  {shownSms.map((s) => (
                    <tr key={s.$id}>
                      <td style={{ color: "var(--foreground)", maxWidth: 420 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.message}</span>
                        {s.status === "failed" && s.provider_response && (
                          <span style={{ display: "block", fontSize: 10.5, color: "#D14F4F", marginTop: 2 }}>{s.provider_response}</span>
                        )}
                      </td>
                      <td style={{ color: "var(--foreground-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>{s.to}</td>
                      <td style={{ color: "var(--foreground-muted)", textTransform: "capitalize" }}>{s.entity_type.replace(/_/g, " ")}</td>
                      <td>
                        {s.status === "sent"
                          ? <Pill text="sent" color="#00965C" bg="rgba(0,184,114,0.12)" />
                          : <Pill text="failed" color="#D14F4F" bg="rgba(209,79,79,0.12)" />}
                      </td>
                      <td suppressHydrationWarning style={{ color: "var(--foreground-muted)", whiteSpace: "nowrap" }}>
                        {formatRelativeTime(s.$createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

        .logs-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .logs-tabs { display: flex; gap: 4px; background: var(--surface-2, rgba(0,0,0,0.03));
                     padding: 3px; border-radius: var(--radius-md, 8px); }
        .logs-tab { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
                    border: none; background: none; cursor: pointer; border-radius: var(--radius-sm, 6px);
                    font-size: 12px; font-weight: 500; color: var(--foreground-muted);
                    font-family: var(--font-body); transition: background 0.12s, color 0.12s; }
        .logs-tab:hover { color: var(--foreground); }
        .logs-tab.is-active { background: var(--surface); color: var(--foreground); font-weight: 600;
                              box-shadow: 0 1px 2px rgba(6,20,13,0.08); }
        .logs-count { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 99px;
                      background: var(--accent-subtle); color: var(--accent); }

        .logs-empty { padding: 34px 18px; text-align: center; font-size: 12.5px; color: var(--foreground-muted); }
        .logs-note { display: flex; align-items: center; gap: 6px; padding: 10px 14px;
                     font-size: 11.5px; color: #B45309; border-bottom: 1px solid var(--border, #E3EEE8); }

        .logs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .logs-table th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 700;
                         text-transform: uppercase; letter-spacing: 0.05em; color: var(--foreground-faint);
                         border-bottom: 1px solid var(--border, #E3EEE8); white-space: nowrap; }
        .logs-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle, #F0F7F3); vertical-align: top; }
        .logs-table tr:last-child td { border-bottom: none; }

        .feed { list-style: none; margin: 0; padding: 0; }
        .feed-row { display: flex; align-items: flex-start; gap: 11px; padding: 11px 16px;
                    border-bottom: 1px solid var(--border-subtle, #F0F7F3); }
        .feed-row:last-child { border-bottom: none; }
        .feed-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .feed-title { font-size: 12.5px; font-weight: 600; color: var(--foreground); }
        .feed-link { color: inherit; text-decoration: none; }
        .feed-link:hover { color: var(--accent); }
        .feed-detail { font-size: 11.5px; color: var(--foreground-muted); margin-top: 1px;
                       overflow: hidden; text-overflow: ellipsis; }
        .feed-time { font-size: 11px; color: var(--foreground-faint); white-space: nowrap; flex-shrink: 0; }

        @media (max-width: 640px) {
          .logs-toolbar > div:last-child { width: 100%; }
          .logs-toolbar > div:last-child > div { flex: 1; width: auto; }
          .logs-tabs { width: 100%; }
          .logs-tab { flex: 1; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
