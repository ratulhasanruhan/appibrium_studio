"use client";

import { useState, useEffect } from "react";
import { Bell, Eye, EyeOff, Check, Loader2, ArrowRight, Plus, X, AlertCircle } from "lucide-react";
import type { Notification, Client } from "@/types";
import { formatRelativeTime } from "@/utils";
import { getNotifications, markNotificationAsRead, createNotification } from "@/services/notifications";
import { getClients } from "@/services/crm";
import { sendCustomNotificationEmail } from "@/services/email";
import { sendCustomSMS } from "@/services/sms";
import { account } from "@/lib/appwrite/client";
import Link from "next/link";

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<"all" | "unread">("unread");

  // Admin and user states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [clients, setClients]         = useState<Client[]>([]);
  const [showModal, setShowModal]     = useState(false);

  // Form states
  const [newTitle, setNewTitle]       = useState("");
  const [newMessage, setNewMessage]   = useState("");
  const [targetUser, setTargetUser]   = useState("all");
  const [sendMail, setSendMail]       = useState(true);
  const [sendSms, setSendSms]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function loadData() {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("[NotificationsList] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    async function checkUserRole() {
      try {
        const user = await account.get();
        setCurrentUser(user);
        const labels = user.labels || [];
        const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
        setIsAdmin(admin);

        if (admin) {
          const list = await getClients();
          setClients(list);
        }
      } catch (err) {
        console.error("[NotificationsList] checkUserRole error:", err);
      }
    }
    checkUserRole();
  }, []);

  const filtered = notifications.filter((n) => {
    // Standard unread filtering
    if (filter === "unread" && n.is_read) return false;
    
    // User role scoping
    if (isAdmin) return true; // Admin views all logs
    return n.user_id === "all" || n.user_id === currentUser?.$id;
  });

  async function handleMarkRead(id: string) {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.$id === id ? { ...n, is_read: true } : n))
      );
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markNotificationAsRead(n.$id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newMessage) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      if (targetUser === "all") {
        // 1. Create a single broadcast notification in Appwrite
        await createNotification({
          user_id: "all",
          title: newTitle,
          message: newMessage,
          type: "info",
          is_read: false,
        });

        // 2. Loop clients and dispatch mail/SMS
        await Promise.all(
          clients.map(async (c) => {
            if (sendMail && c.email) {
              try {
                await sendCustomNotificationEmail(c.email, c.name, newTitle, newMessage);
              } catch (emailErr) {
                console.error("Email send failed to client:", c.email, emailErr);
              }
            }
            if (sendSms && c.phone) {
              try {
                await sendCustomSMS(c.phone, newTitle, newMessage);
              } catch (smsErr) {
                console.error("SMS send failed to client:", c.phone, smsErr);
              }
            }
          })
        );
      } else {
        const targetCli = clients.find((c) => c.$id === targetUser);
        if (targetCli) {
          // 1. Create client-scoped database notification entry
          await createNotification({
            user_id: targetCli.$id,
            title: newTitle,
            message: newMessage,
            type: "info",
            is_read: false,
          });

          // 2. Outbound Resend Email
          if (sendMail && targetCli.email) {
            await sendCustomNotificationEmail(targetCli.email, targetCli.name, newTitle, newMessage);
          }

          // 3. Outbound SMS
          if (sendSms && targetCli.phone) {
            await sendCustomSMS(targetCli.phone, newTitle, newMessage);
          }
        }
      }

      setSaveStatus("saved");
      setNewTitle("");
      setNewMessage("");
      setTargetUser("all");
      setSendMail(true);
      setSendSms(false);

      await loadData();

      setTimeout(() => {
        setShowModal(false);
        setSaveStatus("idle");
      }, 1000);
    } catch (err) {
      console.error("[NotificationsList] submit error:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--foreground-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setFilter("unread")}
            style={{
              padding: "5px 12px", borderRadius: "var(--radius-md)", fontSize: 12,
              fontFamily: "var(--font-body)", fontWeight: filter === "unread" ? 600 : 400, cursor: "pointer",
              background: filter === "unread" ? "var(--accent-subtle)" : "var(--background-alt)",
              color: filter === "unread" ? "var(--accent)" : "var(--foreground-muted)",
              border: `1px solid ${filter === "unread" ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
              transition: "all 0.1s",
            }}
          >Unread Only</button>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "5px 12px", borderRadius: "var(--radius-md)", fontSize: 12,
              fontFamily: "var(--font-body)", fontWeight: filter === "all" ? 600 : 400, cursor: "pointer",
              background: filter === "all" ? "var(--accent-subtle)" : "var(--background-alt)",
              color: filter === "all" ? "var(--accent)" : "var(--foreground-muted)",
              border: `1px solid ${filter === "all" ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
              transition: "all 0.1s",
            }}
          >All Alerts</button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={13} /> Create Notification
            </button>
          )}

          {notifications.some((n) => !n.is_read) && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={handleMarkAllRead}
            >
              <Check size={12} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading activity alerts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "60px 20px", textAlign: "center" }}>
            <Bell size={32} style={{ color: "var(--foreground-faint)" }} />
            <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
              {filter === "unread" ? "You're all caught up! No unread notifications." : "No alerts on record."}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.$id}
              className="card"
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderLeft: n.is_read ? "1px solid var(--border)" : "3px solid var(--accent)",
                background: n.is_read ? "var(--background-alt)" : "var(--accent-subtle)20",
                transition: "background 0.15s",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: n.is_read ? "var(--surface)" : "var(--accent-subtle)", color: n.is_read ? "var(--foreground-muted)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bell size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: "var(--foreground)", margin: 0 }}>{n.title}</p>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2, margin: 0 }}>{n.message}</p>
                <span suppressHydrationWarning style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4, display: "inline-block" }}>
                  {formatRelativeTime(n.$createdAt)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {!n.is_read && (
                  <button className="btn btn-ghost" style={{ padding: 4, cursor: "pointer" }} title="Mark as Read" onClick={() => handleMarkRead(n.$id)}>
                    <EyeOff size={13} />
                  </button>
                )}
                {n.link && (
                  <Link href={n.link} className="btn btn-ghost" style={{ padding: 4 }} title="View Source">
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,35,23,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>Create New Alert Notification</h3>
              <button className="btn btn-ghost" style={{ padding: 4, cursor: "pointer" }} onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle} htmlFor="notif-title">Title / Headline *</label>
                <input
                  id="notif-title"
                  className="input-base"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Server Maintenance Scheduled"
                  required
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="notif-message">Message Details *</label>
                <textarea
                  id="notif-message"
                  className="input-base"
                  style={{ minHeight: 80, resize: "vertical" }}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Provide details about the alert..."
                  required
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="notif-target">Target Audience *</label>
                <select
                  id="notif-target"
                  className="input-base"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                >
                  <option value="all">All Clients (Broadcast)</option>
                  {clients.map((c) => (
                    <option key={c.$id} value={c.$id}>{c.name} {c.email ? `— ${c.email}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Channels checkboxes */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", background: "var(--background-alt)", marginTop: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Delivery channels</p>
                <div style={{ display: "flex", gap: 20 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--foreground)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sendMail}
                      onChange={(e) => setSendMail(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    Send Email (Resend)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--foreground)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    Send SMS Alert
                  </label>
                </div>
              </div>

              {saveStatus === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FAC5C5", borderRadius: "var(--radius-md)", fontSize: 12, color: "#D14F4F" }}>
                  <AlertCircle size={14} /> Failed to submit notification.
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ cursor: "pointer" }} onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minWidth: 100, cursor: "pointer" }}
                  disabled={saving || !newTitle || !newMessage}
                >
                  {saving ? (
                    <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending...</>
                  ) : saveStatus === "saved" ? (
                    <><Check size={13} /> Dispatched!</>
                  ) : (
                    "Send Alert"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
