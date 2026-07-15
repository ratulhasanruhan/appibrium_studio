"use client";

import { useState, useEffect } from "react";
import { Bell, Eye, EyeOff, Check, Loader2, ArrowRight } from "lucide-react";
import type { Notification } from "@/types";
import { formatRelativeTime } from "@/utils";
import { getNotifications, markNotificationAsRead } from "@/services/notifications";
import Link from "next/link";

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<"all" | "unread">("unread");

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
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  async function handleMarkRead(id: string) {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      // update local state
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
                  <button className="btn btn-ghost" style={{ padding: 4 }} title="Mark as Read" onClick={() => handleMarkRead(n.$id)}>
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
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
