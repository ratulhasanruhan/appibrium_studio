"use client";

import { useState, useEffect } from "react";
import { DollarSign, FolderKanban, Users, TrendingUp, Receipt, Loader2, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getInvoices } from "@/services/invoices";
import { getProjects } from "@/services/projects";
import { getClients } from "@/services/crm";
import type { Invoice, Project, Client } from "@/types";
import { formatCurrency } from "@/utils";

const COLORS = ["#00965C", "#3B72D4", "#B45309", "#D14F4F", "#6B8F7C"];

export function AnalyticsDashboard() {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invList, projList, cliList] = await Promise.all([
          getInvoices(),
          getProjects(),
          getClients(),
        ]);
        setInvoices(invList);
        setProjects(projList);
        setClients(cliList);
      } catch (err) {
        console.error("[Analytics] failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute metrics
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const outstanding  = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const avgBudget    = projects.length > 0 ? projects.reduce((s, p) => s + (p.budget || 0), 0) / projects.length : 0;

  // Monthly Revenue Chart Data
  const monthlyData: Record<string, number> = {};
  invoices.forEach((inv) => {
    if (inv.status !== "paid") return;
    const date = new Date(inv.$createdAt || inv.issue_date);
    const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
    monthlyData[label] = (monthlyData[label] || 0) + inv.total;
  });

  const chartData = Object.keys(monthlyData).map((key) => ({
    month: key,
    revenue: monthlyData[key],
  })).slice(-6); // last 6 months

  // Projects status distribution
  const statusCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const pieData = Object.keys(statusCounts).map((key) => ({
    name: key.replace("_", " ").toUpperCase(),
    value: statusCounts[key],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total Revenue Generated", value: formatCurrency(totalRevenue), icon: DollarSign, color: "var(--accent)" },
          { label: "Total Outstanding Accounts", value: formatCurrency(outstanding), icon: TrendingUp, color: "#B45309" },
          { label: "Average Project Value", value: formatCurrency(avgBudget), icon: FolderKanban, color: "#3B72D4" },
          { label: "Active CRM Clients", value: String(clients.length), icon: Users, color: "#6D3FC7" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "var(--shadow-xs)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{label}</p>
              {loading
                ? <div style={{ height: 28, width: 80, background: "var(--surface)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                : <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>{value}</p>
              }
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", color }}>
              <Icon size={15} />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground-muted)" }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> Loading analytics...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          {/* Bar Chart card */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 20 }}>Monthly Revenue Growth</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart card */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 20 }}>Project Distribution</h3>
            {pieData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground-muted)", fontSize: 12 }}>
                No project status data.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ height: 160, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legends */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {pieData.map((entry, index) => (
                    <span key={entry.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--foreground-muted)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[index % COLORS.length] }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
