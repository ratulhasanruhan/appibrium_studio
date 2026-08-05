"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, PiggyBank, Loader2,
  Download, FileDown, Users, UserCog, Loader2 as Spin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { getInvoices } from "@/services/invoices";
import { getProjects } from "@/services/projects";
import { getClients } from "@/services/crm";
import { getTransactions } from "@/services/transactions";
import { getEngagements } from "@/services/engagements";
import {
  calcCompanyFinancials, monthlySeries, clientFinancials, teamFinancials,
  withinMonths, invoiceIncomeDate, isOutflow,
} from "@/lib/finance";
import { buildFinancialReportHtml, type ReportSection } from "./report-html";
import { getPeople } from "@/services/people";
import { getCompanyDetails } from "@/services/settings";
import { authHeader } from "@/lib/auth-client";
import { downloadCsv, type CsvRow } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/utils";
import type { Invoice, Project, Client, Transaction, Engagement, Person } from "@/types";

const PIE_COLORS = ["#00965C", "#3B72D4", "#B45309", "#D14F4F", "#6B8F7C"];

/** Reporting windows, in months. 0 means everything on record. */
const PERIODS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "All", months: 0 },
];

export function AnalyticsDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [months, setMonths] = useState(6);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [inv, proj, cli, txs, engs, ppl] = await Promise.all([
          getInvoices(), getProjects(), getClients(), getTransactions(), getEngagements(), getPeople(),
        ]);
        setInvoices(inv); setProjects(proj); setClients(cli);
        setTransactions(txs); setEngagements(engs); setPeople(ppl);
      } catch (err) {
        console.error("[Analytics] failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Scope the ledger to the chosen window; commitments always reflect today.
  const periodInvoices = months
    ? withinMonths(invoices, invoiceIncomeDate, months)
    : invoices;
  const periodTx = months
    ? withinMonths(transactions, (t) => t.transaction_date || t.$createdAt, months)
    : transactions;

  const co = calcCompanyFinancials(periodInvoices, periodTx, projects, engagements);
  const series = monthlySeries(invoices, transactions, months || 12);
  const byClient = clientFinancials(clients, invoices, projects);
  const byTeam = teamFinancials(people, engagements, transactions.filter((t) => t.person_id));

  const statusCounts: Record<string, number> = {};
  projects.forEach((p) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([k, v]) => ({
    name: k.replace("_", " ").toUpperCase(), value: v,
  }));

  // withinMonths(1) starts at the first of the current month, so "1M" really
  // means this month to date rather than a rolling 30 days.
  const periodLabel = months === 0 ? "all time" : months === 1 ? "this month" : `last ${months} months`;
  const periodTitle = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

  function exportCsv() {
    const rows: CsvRow[] = [
      ["Appibrium Studio — Financial Report"],
      ["Generated", formatDate(new Date())],
      ["Period", periodLabel],
      [],
      ["SUMMARY"],
      ["Invoices paid", co.received],
      ["Other income", co.otherIncome],
      ["Total in", co.totalIncome],
      ["Paid to team", co.teamPaid],
      ["Other expenses", co.otherExpenses],
      ["Total out", co.totalExpenses],
      ["Cash on hand", co.onHand],
      ["Invoiced, awaiting payment", co.receivable],
      ["Agreed project value", co.agreedProjectValue],
      ["Still to collect", co.stillToCollect],
      ["Engaged team budget", co.teamEngaged],
      ["Still to give team", co.teamOwed],
      ["Final standing", co.finalStanding],
      [],
      ["MONTHLY"],
      ["Month", "Income", "Expenses", "Net"],
      ...series.map((m): CsvRow => [m.label, m.income, m.expenses, m.net]),
      [],
      ["BY CLIENT"],
      ["Client", "Projects", "Agreed", "Invoiced", "Received", "Outstanding", "Still to collect"],
      ...byClient.map((c): CsvRow => [
        c.name, c.projects, c.agreed, c.invoiced, c.received, c.outstanding, c.stillToCollect,
      ]),
      [],
      ["BY TEAM MEMBER"],
      ["Person", "Role", "Type", "Engagements", "Agreed", "Paid", "Still owed"],
      ...byTeam.map((m): CsvRow => [m.name, m.role, m.type, m.engagements, m.agreed, m.paid, m.owed]),
      [],
      ["TRANSACTIONS"],
      ["Date", "Description", "Category", "Type", "Amount"],
      ...periodTx.map((t): CsvRow => [
        t.transaction_date, t.description, t.category || "", t.type,
        isOutflow(t) ? -(t.amount || 0) : (t.amount || 0),
      ]),
    ];
    downloadCsv(`appibrium-financial-report-${new Date().toISOString().slice(0, 10)}`, rows);
  }

  async function downloadPdf(opts?: { sections?: ReportSection[]; heading?: string; slug?: string }) {
    setPdfBusy(true);
    try {
      const co2 = await getCompanyDetails();
      const html = buildFinancialReportHtml({
        companyName: co2.name,
        companyAddress: co2.address,
        periodLabel: periodTitle,
        totals: co, months: series, clients: byClient, team: byTeam,
        sections: opts?.sections,
        heading: opts?.heading,
      });
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: await authHeader(),
        body: JSON.stringify({ html, filename: `financial-report-${new Date().toISOString().slice(0, 10)}.pdf` }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appibrium-${opts?.slug ?? "financial-report"}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Analytics] PDF export failed:", err);
      alert("Could not build the PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--foreground-muted)" }}>
        <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /> Loading analytics...
      </div>
    );
  }

  const kpis = [
    { label: "Income", value: co.totalIncome, color: "#00965C", icon: TrendingUp },
    { label: "Expenses", value: co.totalExpenses, color: "#D14F4F", icon: TrendingDown },
    { label: "Cash on Hand", value: co.onHand, color: co.onHand >= 0 ? "var(--foreground)" : "#D14F4F", icon: DollarSign },
    { label: "Final Standing", value: co.finalStanding, color: co.finalStanding >= 0 ? "#00965C" : "#D14F4F", icon: PiggyBank },
  ];

  return (
    <div className="an-wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }} className="no-print">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setMonths(p.months)}
              style={{
                padding: "5px 14px", borderRadius: "var(--radius-md)", fontSize: 12, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: months === p.months ? 600 : 400,
                background: months === p.months ? "var(--accent-subtle)" : "var(--background-alt)",
                color: months === p.months ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${months === p.months ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
              }}
            >{p.label}</button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--foreground-muted)" }}>Showing {periodLabel}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }} className="no-print">
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={exportCsv}>
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => downloadPdf()} disabled={pdfBusy}>
            {pdfBusy ? <Spin size={13} style={{ animation: "spin 1s linear infinite" }} /> : <FileDown size={13} />}
            {pdfBusy ? "Building PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="print-only an-print-head">
        <h1>Financial Report</h1>
        <p>Appibrium Technology Co. · {periodLabel} · generated {formatDate(new Date())}</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", boxShadow: "var(--shadow-xs)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{label}</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color }}>{formatCurrency(value)}</p>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", color, flexShrink: 0 }}>
              <Icon size={15} />
            </div>
          </div>
        ))}
      </div>

      {/* Income vs expenses over time */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Income vs Expenses by Month</h3>
          <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Net line shown per month in the tooltip</span>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value) || 0),
                  String(name) === "income" ? "Income" : "Expenses",
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === "income" ? "Income" : "Expenses")} />
              <Bar dataKey="income" fill="#00B872" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#D14F4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Monthly Breakdown</h3>
          <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Same figures as the chart, to the taka</span>
        </div>
        <div className="an-scroll" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 420 }}>
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                {["Month", "Income", "Expenses", "Net"].map((h, i) => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "right", fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((m) => (
                <tr key={m.key} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "var(--foreground)" }}>{m.label}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#00965C" }}>{formatCurrency(m.income)}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#D14F4F" }}>{formatCurrency(m.expenses)}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: m.net >= 0 ? "var(--foreground)" : "#D14F4F" }}>{formatCurrency(m.net)}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--surface)" }}>
                <td style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total</td>
                {(["income", "expenses", "net"] as const).map((k) => (
                  <td key={k} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", color: k === "income" ? "#00965C" : k === "expenses" ? "#D14F4F" : "var(--foreground)" }}>
                    {formatCurrency(series.reduce((a, m) => a + m[k], 0))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Position + project mix */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }} className="an-split">
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Position Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="an-split">
            {[
              { t: "Client Side", rows: [
                { k: "Agreed project value", v: co.agreedProjectValue, c: "var(--foreground)" },
                { k: "Invoiced, awaiting payment", v: co.receivable, c: "#B45309" },
                { k: "Still to collect", v: co.stillToCollect, c: co.stillToCollect > 0 ? "#B45309" : "#00965C" },
              ]},
              { t: "Team Side", rows: [
                { k: "Engaged budget", v: co.teamEngaged, c: "var(--foreground)" },
                { k: "Paid out", v: co.teamPaid, c: "#00965C" },
                { k: "Still to give", v: co.teamOwed, c: co.teamOwed > 0 ? "#D14F4F" : "#00965C" },
              ]},
            ].map((g) => (
              <div key={g.t} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{g.t}</p>
                {g.rows.map((r) => (
                  <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "3px 0" }}>
                    <span style={{ color: "var(--foreground-muted)" }}>{r.k}</span>
                    <span style={{ fontWeight: 700, color: r.c, whiteSpace: "nowrap" }}>{formatCurrency(r.v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Project Mix</h3>
          {pieData.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No projects yet.</p>
          ) : (
            <>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {pieData.map((e, i) => (
                  <span key={e.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--foreground-muted)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {e.name} ({e.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Per client */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} style={{ color: "var(--accent)" }} /> By Client
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Lifetime figures, highest earning first</span>
            <button
              className="btn btn-ghost no-print"
              style={{ fontSize: 11, padding: "4px 10px" }}
              disabled={pdfBusy}
              onClick={() => downloadPdf({ sections: ["clients"], heading: "Client Report", slug: "client-report" })}
            >
              <FileDown size={12} /> Client PDF
            </button>
          </div>
        </div>
        {byClient.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No clients yet.</p>
        ) : (
          <div className="an-scroll" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  {["Client", "Projects", "Agreed", "Invoiced", "Received", "Outstanding", "To Collect"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "right", fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byClient.map((c) => (
                  <tr key={c.clientId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--foreground)" }}>{c.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)" }}>{c.projects}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-2)" }}>{formatCurrency(c.agreed)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-2)" }}>{formatCurrency(c.invoiced)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#00965C" }}>{formatCurrency(c.received)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: c.outstanding > 0 ? "#B45309" : "var(--foreground-muted)" }}>{formatCurrency(c.outstanding)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: c.stillToCollect > 0 ? "#D14F4F" : "var(--foreground-muted)" }}>{formatCurrency(c.stillToCollect)}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--surface)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{byClient.reduce((s, c) => s + c.projects, 0)}</td>
                  {(["agreed", "invoiced", "received", "outstanding", "stillToCollect"] as const).map((k) => (
                    <td key={k} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", color: k === "received" ? "#00965C" : "var(--foreground)" }}>
                      {formatCurrency(byClient.reduce((s, c) => s + c[k], 0))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Per team member */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", display: "flex", alignItems: "center", gap: 6 }}>
            <UserCog size={14} style={{ color: "var(--accent)" }} /> By Team Member
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>What each person is owed against what they were engaged for</span>
            <button
              className="btn btn-ghost no-print"
              style={{ fontSize: 11, padding: "4px 10px" }}
              disabled={pdfBusy}
              onClick={() => downloadPdf({ sections: ["team"], heading: "Team Report", slug: "team-report" })}
            >
              <FileDown size={12} /> Team PDF
            </button>
          </div>
        </div>
        {byTeam.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No team members yet.</p>
        ) : (
          <div className="an-scroll" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  {["Person", "Type", "Engagements", "Agreed", "Paid", "Still Owed", "Settled"].map((h, i) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "right", fontSize: 10, fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byTeam.map((m) => (
                  <tr key={m.personId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <p style={{ fontWeight: 600, color: "var(--foreground)" }}>{m.name}</p>
                      <p style={{ fontSize: 10.5, color: "var(--foreground-muted)" }}>{m.role}</p>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)", textTransform: "capitalize" }}>{m.type}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)" }}>{m.engagements}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-2)" }}>{formatCurrency(m.agreed)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#00965C" }}>{formatCurrency(m.paid)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: m.owed > 0 ? 700 : 400, color: m.owed > 0 ? "#D14F4F" : "var(--foreground-muted)" }}>{formatCurrency(m.owed)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)" }}>{m.settledPct}%</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--surface)" }}>
                  <td colSpan={2} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)" }}>Total</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{byTeam.reduce((a, m) => a + m.engagements, 0)}</td>
                  {(["agreed", "paid", "owed"] as const).map((k) => (
                    <td key={k} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontFamily: "var(--font-heading)", color: k === "paid" ? "#00965C" : k === "owed" ? "#D14F4F" : "var(--foreground)" }}>
                      {formatCurrency(byTeam.reduce((a, m) => a + m[k], 0))}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .print-only { display: none; }

        @media (max-width: 720px) {
          .an-split { grid-template-columns: 1fr !important; }
        }

        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .no-print { display: none !important; }
          .print-only { display: block; }
          .an-print-head h1 { font-size: 20px; font-family: 'Jost', sans-serif; color: #0D2317; }
          .an-print-head p { font-size: 11px; color: #6B8F7C; margin-top: 3px; }
          .an-wrap { gap: 12px !important; }
          .card { break-inside: avoid; box-shadow: none !important; }
          .an-scroll { overflow: visible !important; }
          .an-scroll table { min-width: 0 !important; }
        }
      `}</style>
    </div>
  );
}
