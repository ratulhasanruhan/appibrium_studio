"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { client, account } from "@/lib/appwrite/client";
import { cn } from "@/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  ArrowLeftRight,
  HardDrive,
  BarChart3,
  Bell,
  Bot,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const primaryNav: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "CRM",          href: "/crm",          icon: Users },
  { label: "Projects",     href: "/projects",     icon: FolderKanban },
  { label: "Proposals",    href: "/proposals",    icon: FileText },
  { label: "Invoices",     href: "/invoices",     icon: Receipt },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
];

const toolsNav: NavItem[] = [
  { label: "Files",        href: "/files",        icon: HardDrive },
  { label: "Analytics",   href: "/analytics",    icon: BarChart3 },
  { label: "AI Assistant", href: "/assistant",    icon: Bot },
];

const systemNav: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings",      href: "/settings",      icon: Settings },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn("sidebar-item", isActive && "active")}
    >
      <Icon size={15} className="icon" />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const [userName, setUserName] = useState("");
  const [userLabel, setUserLabel] = useState("");

  useEffect(() => {
    // Ping Appwrite server on mount
    if (typeof (client as any).ping === "function") {
      (client as any).ping().then((ok: boolean) => {
        console.log(`[Appwrite Connection]: ${ok ? "Connected successfully! ✓" : "Failed to ping server. ✗"}`);
      });
    }

    // Load active profile details
    account
      .get()
      .then((user) => {
        setUserName(user.name);
        const labels = (user as any).labels || [];
        if (labels.length > 0) {
          setUserLabel(labels[0]);
        } else {
          setUserLabel("Owner");
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await account.deleteSession("current");
        window.location.href = "/login";
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  }

  return (
    <aside className="sidebar">

      {/* ─── Wordmark Header ─── */}
      <div className="sidebar-header">
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }} className="select-none">
          <img
            src="/branding_assets/logos/lockup/lockup_w4_light.svg"
            alt="Appibrium"
            style={{ height: 28, width: "auto", objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />
          <span className="studio-mark" style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 16, letterSpacing: "0.08em", color: "var(--accent)" }}>
            Studio
          </span>
        </Link>
      </div>

      {/* ─── Workspace Pill ─── */}
      <div style={{ padding: "10px 10px 4px" }}>
        <button
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 10px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: "var(--shadow-xs)",
            transition: "box-shadow 0.12s, border-color 0.12s",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "#FFFFFF",
                fontFamily: "var(--font-heading)",
                flexShrink: 0,
              }}
            >
              A
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--foreground)",
                fontFamily: "var(--font-body)",
              }}
            >
              Appibrium
            </span>
          </div>
          <ChevronDown size={12} style={{ color: "var(--foreground-muted)" }} />
        </button>
      </div>

      {/* ─── Primary Nav ─── */}
      <div className="sidebar-section" style={{ marginTop: 4 }}>
        <p className="sidebar-label">Workspace</p>
        {primaryNav.map((item) => <NavLink key={item.href} item={item} />)}
      </div>

      {/* ─── Tools Nav ─── */}
      <div className="sidebar-section" style={{ marginTop: 8 }}>
        <p className="sidebar-label">Tools</p>
        {toolsNav.map((item) => <NavLink key={item.href} item={item} />)}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ─── System Nav ─── */}
      <div
        className="sidebar-section"
        style={{ borderTop: "1px solid var(--border)", paddingTop: 8, paddingBottom: 10 }}
      >
        {systemNav.map((item) => <NavLink key={item.href} item={item} />)}
      </div>

      {/* ─── User Profile ─── */}
      <div style={{ padding: "10px 10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 4px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accent-subtle)",
              border: "1.5px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--accent)",
              fontFamily: "var(--font-heading)",
              flexShrink: 0,
            }}
          >
            {userName ? userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "RH"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground)",
                fontFamily: "var(--font-body)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                margin: 0,
              }}
            >
              {userName || "Ratul Hasan"}
            </p>
            <p style={{ fontSize: 10, color: "var(--foreground-muted)", textTransform: "capitalize", margin: 0 }}>
              {userLabel || "Owner"}
            </p>
          </div>
        </div>
        <button
          className="btn-logout"
          onClick={handleLogout}
          title="Sign Out"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--foreground-muted)",
            padding: 8,
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#FEE2E2";
            e.currentTarget.style.color = "#DC2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "var(--foreground-muted)";
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

    </aside>
  );
}
