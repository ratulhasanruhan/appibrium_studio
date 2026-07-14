"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  FileText,
  Receipt,
  ArrowRight,
  Users,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatRelativeTime, initials } from "@/utils";
import { getInvoices } from "@/services/invoices";
import { getProposals } from "@/services/proposals";
import { getClients } from "@/services/crm";
import { getProjects } from "@/services/projects";
import type { Invoice, Proposal, Client, Project } from "@/types";
import Link from "next/link";

// ─── Stat Card ──────────────────────────────────────────────────────── //
function StatCard({
  id,
  label,
  value,
  delta,
  deltaUp,
  icon: Icon,
  accent = false,
  loading = false,
}: {
  id: string;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ElementType;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      id={id}
      className="stat-card"
      style={
        accent
          ? {
              background: "linear-gradient(135deg, #E6FAF3 0%, #F4FBF7 100%)",
              borderColor: "#B3E8D2",
            }
          : {}
      }
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <p className="stat-card-label">{label}</p>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--radius-md)",
            background: accent ? "rgba(0,184,114,0.1)" : "var(--surface)",
            border: `1px solid ${accent ? "#B3E8D2" : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent ? "var(--accent)" : "var(--foreground-muted)",
            flexShrink: 0,
          }}
        >
          <Icon size={14} />
        </div>
      </div>
      {loading ? (
        <div style={{ height: 28, display: "flex", alignItems: "center" }}>
          <div style={{ width: 80, height: 20, borderRadius: 4, background: "var(--surface)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : (
        <p className="stat-card-value">{value}</p>
      )}
      {delta && !loading && (
        <p className="stat-card-delta">
          {deltaUp
            ? <TrendingUp size={11} style={{ color: "#00965C" }} />
            : <TrendingDown size={11} style={{ color: "#D14F4F" }} />}
          <span className={deltaUp ? "delta-up" : "delta-down"}>{delta}</span>
        </p>
      )}
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────── //
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: "var(--font-body)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p style={{ color: "var(--foreground-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.name === "revenue" ? "#00965C" : "#9CA3AF", marginBottom: 2 }}>
          {entry.name === "revenue" ? "Revenue" : "Pending"}:{" "}
          <strong>{formatCurrency(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Activity dot colors ─────────────────────────────────────────────── //
const activityColors: Record<string, string> = {
  accepted: "#00965C",
  paid:     "#00965C",
  client:   "#3B72D4",
  sent:     "#B45309",
  overdue:  "#D14F4F",
  draft:    "#6B8F7C",
  new:      "#3B72D4",
};

// Build month buckets for the last 6 months
function buildMonthBuckets(invoices: Invoice[]) {
  const now = new Date();
  const months: { month: string; revenue: number; pending: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString("default", { month: "short" }),
      revenue: 0,
      pending: 0,
    });
  }

  for (const inv of invoices) {
    const d = new Date(inv.$createdAt || inv.issue_date);
    const monthStr = d.toLocaleString("default", { month: "short" });
    const bucket = months.find((m) => m.month === monthStr);
    if (!bucket) continue;
    if (inv.status === "paid") {
      bucket.revenue += inv.total || 0;
    } else if (inv.status === "sent" || inv.status === "overdue") {
      bucket.pending += inv.total || 0;
    }
  }
  return months;
}

// ─── Main Widgets ────────────────────────────────────────────────────── //
export function DashboardWidgets() {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [inv, prop, cli, proj] = await Promise.all([
          getInvoices(),
          getProposals(),
          getClients(),
          getProjects(),
        ]);
        setInvoices(inv);
        setProposals(prop);
        setClients(cli);
        setProjects(proj);
      } catch (err) {
        console.error("[Dashboard] load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Computed stats
  const totalRevenue    = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding     = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + (i.total || 0), 0);
  const pendingProposals = proposals.filter((p) => p.status === "sent" || p.status === "viewed" || p.status === "review").length;
  const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue").length;
  const chartData       = buildMonthBuckets(invoices);

  // Top clients by invoice revenue
  const clientRevenueMap = new Map<string, { name: string; revenue: number; invoices: number }>();
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const cli = clients.find((c) => c.$id === inv.client_id);
    if (!cli) continue;
    const entry = clientRevenueMap.get(inv.client_id) ?? { name: cli.name, revenue: 0, invoices: 0 };
    entry.revenue += inv.total || 0;
    entry.invoices += 1;
    clientRevenueMap.set(inv.client_id, entry);
  }
  const topClients = Array.from(clientRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Project status counts
  const projectStatusMap = new Map<string, number>();
  for (const p of projects) {
    projectStatusMap.set(p.status, (projectStatusMap.get(p.status) ?? 0) + 1);
  }
  const projectStatuses = [
    { label: "Active",    key: "active",    color: "#00965C", bg: "#E6FAF3" },
    { label: "Planning",  key: "planning",  color: "#3B72D4", bg: "#EEF4FF" },
    { label: "On Hold",   key: "on_hold",   color: "#B45309", bg: "#FFFBEB" },
    { label: "Completed", key: "completed", color: "#6B8F7C", bg: "#F1F5F2" },
  ].map((s) => ({ ...s, count: projectStatusMap.get(s.key) ?? 0 }));
  const totalProjects = projects.length;

  // Recent activity — combine recent docs sorted by date
  type ActivityItem = { action: string; entity: string; time: string; type: string };
  const activity: ActivityItem[] = [
    ...invoices.slice(0, 3).map((i) => ({
      action: i.status === "paid" ? "Invoice paid" : i.status === "overdue" ? "Invoice overdue" : "Invoice sent",
      entity: i.title || `INV-${i.$id.slice(-4).toUpperCase()}`,
      time:   i.$createdAt,
      type:   i.status === "paid" ? "paid" : i.status === "overdue" ? "overdue" : "sent",
    })),
    ...proposals.slice(0, 3).map((p) => ({
      action: p.status === "accepted" ? "Proposal accepted" : p.status === "sent" ? "Proposal sent" : "Proposal created",
      entity: p.title || `PROP-${p.$id.slice(-4).toUpperCase()}`,
      time:   p.$updatedAt || p.$createdAt,
      type:   p.status === "accepted" ? "accepted" : "sent",
    })),
    ...clients.slice(0, 2).map((c) => ({
      action: "New client added",
      entity: c.name,
      time:   c.$createdAt,
      type:   "client",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard id="stat-total-revenue"     label="Total Revenue"     value={formatCurrency(totalRevenue)}  icon={DollarSign} accent loading={loading} />
        <StatCard id="stat-outstanding"       label="Outstanding"       value={formatCurrency(outstanding)}   icon={Clock}      loading={loading} />
        <StatCard id="stat-pending-proposals" label="Pending Proposals" value={String(pendingProposals)}      icon={FileText}   loading={loading} />
        <StatCard id="stat-pending-invoices"  label="Pending Invoices"  value={String(pendingInvoices)}       icon={Receipt}    loading={loading} />
      </div>

      {/* ─── Chart + Activity ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>

        {/* Revenue Area Chart */}
        <div id="chart-revenue" className="card" style={{ padding: "18px 18px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Revenue Overview</h2>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>Revenue vs Pending · Last 6 months</p>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {[["#00965C", "Revenue"], ["#D6EDE1", "Pending"]].map(([color, label]) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--foreground-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", border: "1px solid var(--border)" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={20} style={{ color: "var(--foreground-faint)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00B872" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#00B872" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D6EDE1" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#D6EDE1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B8F7C", fontFamily: "var(--font-body)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6B8F7C", fontFamily: "var(--font-body)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pending" stroke="#D6EDE1" strokeWidth={1.5} fill="url(#pendingGrad)" />
                <Area type="monotone" dataKey="revenue" stroke="#00B872" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "#00B872", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity */}
        <div id="panel-activity" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Recent Activity</h2>
          </div>
          <div>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
                <Loader2 size={18} style={{ color: "var(--foreground-faint)", animation: "spin 1s linear infinite" }} />
              </div>
            ) : activity.length === 0 ? (
              <div style={{ padding: "40px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No activity yet.</p>
              </div>
            ) : (
              activity.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 18px",
                    borderBottom: i < activity.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: activityColors[item.type] ?? "var(--foreground-faint)",
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "var(--foreground)", fontWeight: 500 }}>{item.action}</p>
                    <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.entity}</p>
                  </div>
                  <span suppressHydrationWarning style={{ fontSize: 10, color: "var(--foreground-faint)", flexShrink: 0 }}>
                    {formatRelativeTime(item.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Row ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Top Clients */}
        <div id="panel-top-clients" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Top Clients</h2>
            <Link href="/crm" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
                <Loader2 size={18} style={{ color: "var(--foreground-faint)", animation: "spin 1s linear infinite" }} />
              </div>
            ) : topClients.length === 0 ? (
              <div style={{ padding: "40px 18px", textAlign: "center" }}>
                <Users size={28} style={{ color: "var(--foreground-faint)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No paid invoices yet.</p>
              </div>
            ) : (
              topClients.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 18px",
                    borderBottom: i < topClients.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    transition: "background 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--accent)",
                      fontFamily: "var(--font-heading)",
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{c.invoices} invoice{c.invoices !== 1 ? "s" : ""}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                    {formatCurrency(c.revenue)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project Status */}
        <div id="panel-project-status" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Project Status</h2>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>{totalProjects} total project{totalProjects !== 1 ? "s" : ""}</p>
          </div>
          <div style={{ padding: "18px" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                <Loader2 size={18} style={{ color: "var(--foreground-faint)", animation: "spin 1s linear infinite" }} />
              </div>
            ) : totalProjects === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No projects yet.</p>
              </div>
            ) : (
              projectStatuses.map((s) => {
                const pct = totalProjects > 0 ? Math.round((s.count / totalProjects) * 100) : 0;
                return (
                  <div key={s.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                        <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{s.label}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: s.color,
                          background: s.bg,
                          padding: "1px 7px",
                          borderRadius: 99,
                        }}
                      >
                        {s.count}
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 5, background: "var(--surface)", borderRadius: 99, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: s.color,
                          borderRadius: 99,
                          opacity: 0.75,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
