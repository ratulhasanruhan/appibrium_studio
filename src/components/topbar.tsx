"use client";

import { Search, Bell, Plus } from "lucide-react";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="topbar">

      {/* Page breadcrumb / title */}
      <div style={{ flex: 1 }}>
        {title && (
          <h1
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-heading)",
              color: "var(--foreground)",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 0 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Global Search */}
      <button
        id="global-search-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--foreground-faint)",
          fontSize: 12,
          fontFamily: "var(--font-body)",
          width: 210,
          boxShadow: "var(--shadow-xs)",
          transition: "border-color 0.12s, box-shadow 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#C4DDD0";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "var(--shadow-xs)";
        }}
      >
        <Search size={12} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left" }}>Search...</span>
        <kbd
          style={{
            fontSize: 10,
            padding: "1px 5px",
            borderRadius: 4,
            background: "var(--border)",
            color: "var(--foreground-muted)",
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1.6,
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <button
        id="notifications-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md)",
          background: "var(--background-alt)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--foreground-muted)",
          position: "relative",
          transition: "background 0.12s, border-color 0.12s",
          flexShrink: 0,
          boxShadow: "var(--shadow-xs)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.borderColor = "#C4DDD0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--background-alt)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <Bell size={14} />
        {/* Unread dot */}
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
            border: "1.5px solid var(--background-alt)",
          }}
        />
      </button>

      {/* Action slot */}
      {actions ?? (
        <button
          id="topbar-quick-add"
          className="btn btn-primary"
          style={{ padding: "6px 14px", fontSize: 12 }}
        >
          <Plus size={13} />
          New
        </button>
      )}

    </header>
  );
}
