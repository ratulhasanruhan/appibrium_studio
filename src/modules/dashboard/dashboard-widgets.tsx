"use client";

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  FileText,
  Receipt,
  ArrowRight,
  Circle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatRelativeTime } from "@/utils";

// ─── Mock Data ──────────────────────────────────────────────────────── //
const revenueData = [
  { month: "Jan", revenue: 12400, expenses: 4200 },
  { month: "Feb", revenue: 18600, expenses: 5100 },
  { month: "Mar", revenue: 15800, expenses: 4600 },
  { month: "Apr", revenue: 22100, expenses: 6200 },
  { month: "May", revenue: 19500, expenses: 5800 },
  { month: "Jun", revenue: 28700, expenses: 7100 },
  { month: "Jul", revenue: 31200, expenses: 8200 },
];

const topClients = [
  { name: "TechFlow Inc.",  amount: 48200, projects: 3 },
  { name: "BuildSmart Ltd.", amount: 32100, projects: 2 },
  { name: "DataSync Corp.", amount: 28900, projects: 4 },
  { name: "CloudNova",      amount: 21400, projects: 1 },
  { name: "Nexus Systems",  amount: 18700, projects: 2 },
];

const recentActivity = [
  { action: "Proposal accepted",  entity: "APP-PROP-2026-0047", time: new Date(Date.now() - 12 * 60000).toISOString(),    type: "accepted" },
  { action: "Invoice paid",       entity: "APP-INV-2026-0031",  time: new Date(Date.now() - 45 * 60000).toISOString(),    type: "paid" },
  { action: "New client added",   entity: "Orion Digital",       time: new Date(Date.now() - 2 * 3600000).toISOString(),   type: "client" },
  { action: "Proposal sent",      entity: "APP-PROP-2026-0048", time: new Date(Date.now() - 5 * 3600000).toISOString(),   type: "sent" },
  { action: "Invoice overdue",    entity: "APP-INV-2026-0028",  time: new Date(Date.now() - 24 * 3600000).toISOString(),  type: "overdue" },
];

const projectStatuses = [
  { label: "Active",    count: 8,  color: "#00965C", bg: "#E6FAF3" },
  { label: "Planning",  count: 3,  color: "#3B72D4", bg: "#EEF4FF" },
  { label: "On Hold",   count: 2,  color: "#B45309", bg: "#FFFBEB" },
  { label: "Completed", count: 14, color: "#6B8F7C", bg: "#F1F5F2" },
];

// ─── Stat Card ──────────────────────────────────────────────────────── //
function StatCard({
  id,
  label,
  value,
  delta,
  deltaUp,
  icon: Icon,
  accent = false,
}: {
  id: string;
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ElementType;
  accent?: boolean;
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
      <p className="stat-card-value">{value}</p>
      {delta && (
        <p className="stat-card-delta">
          {deltaUp
            ? <TrendingUp size={11} style={{ color: "#00965C" }} />
            : <TrendingDown size={11} style={{ color: "#D14F4F" }} />}
          <span className={deltaUp ? "delta-up" : "delta-down"}>{delta}</span>
          <span style={{ color: "var(--foreground-muted)" }}>vs last month</span>
        </p>
      )}
    </div>
  );
}

// ─── Custom Recharts Tooltip ─────────────────────────────────────────── //
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
          {entry.name === "revenue" ? "Revenue" : "Expenses"}:{" "}
          <strong>{formatCurrency(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Activity dot color ──────────────────────────────────────────────── //
const activityColors: Record<string, string> = {
  accepted: "#00965C",
  paid:     "#00965C",
  client:   "#3B72D4",
  sent:     "#B45309",
  overdue:  "#D14F4F",
};

// ─── Main Widgets ────────────────────────────────────────────────────── //
export function DashboardWidgets() {
  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard id="stat-total-revenue"     label="Total Revenue"      value={formatCurrency(totalRevenue)} delta="+18.4%" deltaUp icon={DollarSign} accent />
        <StatCard id="stat-outstanding"       label="Outstanding"        value={formatCurrency(24600)}       delta="-3.1%"  deltaUp={false} icon={Clock} />
        <StatCard id="stat-pending-proposals" label="Pending Proposals"  value="7"                          delta="+2 this week" deltaUp icon={FileText} />
        <StatCard id="stat-pending-invoices"  label="Pending Invoices"   value="4"                          icon={Receipt} />
      </div>

      {/* ─── Chart + Activity ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>

        {/* Revenue Area Chart */}
        <div id="chart-revenue" className="card" style={{ padding: "18px 18px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Revenue Overview</h2>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>Income vs Expenses · 2026</p>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {[["#00965C", "Revenue"], ["#D6EDE1", "Expenses"]].map(([color, label]) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--foreground-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", border: "1px solid var(--border)" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00B872" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#00B872" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#D6EDE1" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#D6EDE1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6B8F7C", fontFamily: "var(--font-body)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B8F7C", fontFamily: "var(--font-body)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="expenses" stroke="#D6EDE1" strokeWidth={1.5} fill="url(#expenseGrad)" />
              <Area type="monotone" dataKey="revenue"  stroke="#00B872" strokeWidth={2}   fill="url(#revenueGrad)"
                dot={false} activeDot={{ r: 4, fill: "#00B872", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div id="panel-activity" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Recent Activity</h2>
          </div>
          <div>
            {recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 18px",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  transition: "background 0.1s",
                  cursor: "default",
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
                  <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>{item.entity}</p>
                </div>
                <span suppressHydrationWarning style={{ fontSize: 10, color: "var(--foreground-faint)", flexShrink: 0 }}>
                  {formatRelativeTime(item.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Bottom Row ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Top Clients */}
        <div id="panel-top-clients" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Top Clients</h2>
            <button style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500 }}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div>
            {topClients.map((client, i) => (
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
                  {client.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{client.name}</p>
                  <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{client.projects} project{client.projects !== 1 ? "s" : ""}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                  {formatCurrency(client.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Project Status */}
        <div id="panel-project-status" className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Project Status</h2>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>27 total projects</p>
          </div>
          <div style={{ padding: "18px" }}>
            {projectStatuses.map((s) => {
              const total = projectStatuses.reduce((a, c) => a + c.count, 0);
              const pct = Math.round((s.count / total) * 100);
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
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
