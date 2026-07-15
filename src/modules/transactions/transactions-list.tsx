"use client";

import { useState, useEffect } from "react";
import { Search, ArrowDownRight, ArrowUpRight, Plus, Loader2, X, AlertCircle, Check, DollarSign } from "lucide-react";
import type { Transaction, Client } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { getTransactions, createTransaction } from "@/services/transactions";
import { getClients } from "@/services/crm";

const TYPE_COLORS: Record<string, string> = {
  income: "#00965C",
  expense: "#D14F4F",
  advance: "#3B72D4",
  refund: "#B45309",
};

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [typeFilter, setTypeFilter]     = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // Form Fields
  const [type, setType]           = useState<Transaction["type"]>("income");
  const [amount, setAmount]       = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory]   = useState("Marketing");
  const [clientId, setClientId]   = useState("");
  const [tDate, setTDate]         = useState(new Date().toISOString().slice(0, 10));

  async function loadData() {
    setLoading(true);
    try {
      const [txList, cliList] = await Promise.all([getTransactions(), getClients()]);
      setTransactions(txList);
      setClients(cliList);
    } catch (err) {
      console.error("[TransactionsList] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const clientMap = new Map(clients.map((c) => [c.$id, c.name]));

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = t.description.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q));
    const matchType   = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIncome   = transactions.filter((t) => t.type === "income" || t.type === "advance").reduce((s, t) => s + t.amount, 0);
  const totalExpense  = transactions.filter((t) => t.type === "expense" || t.type === "refund").reduce((s, t) => s + t.amount, 0);
  const netBalance    = totalIncome - totalExpense;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description) {
      setSaveError("Amount and description are required.");
      setSaveStatus("error");
      return;
    }

    setSaving(true);
    setSaveError("");
    const result = await createTransaction({
      type,
      amount,
      currency: "BDT",
      status: "completed",
      category: category || undefined,
      description,
      client_id: clientId || undefined,
      transaction_date: tDate,
    });

    setSaving(false);
    if (result.success) {
      setSaveStatus("saved");
      setTimeout(() => {
        setShowModal(false);
        setSaveStatus("idle");
        setAmount(0); setDescription(""); setCategory("Marketing"); setClientId(""); setTDate(new Date().toISOString().slice(0, 10));
        loadData();
      }, 800);
    } else {
      setSaveError(result.error || "Failed to log transaction.");
      setSaveStatus("error");
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
    <div>
      {/* Financial Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Income", value: totalIncome, color: "#00965C", icon: ArrowUpRight },
          { label: "Total Expense", value: totalExpense, color: "#D14F4F", icon: ArrowDownRight },
          { label: "Net Balance", value: netBalance, color: "var(--foreground)", icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", boxShadow: "var(--shadow-xs)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{label}</p>
              {loading
                ? <div style={{ height: 28, width: 80, background: "var(--surface)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                : <p style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color }}>{formatCurrency(value, "BDT")}</p>
              }
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", color }}>
              <Icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input className="input-base" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "income", "expense", "advance", "refund"].map((s) => (
            <button
              key={s}
              onClick={() => setTypeFilter(s)}
              style={{
                padding: "5px 12px", borderRadius: "var(--radius-md)", fontSize: 12,
                fontFamily: "var(--font-body)", fontWeight: typeFilter === s ? 600 : 400, cursor: "pointer",
                background: typeFilter === s ? "var(--accent-subtle)" : "var(--background-alt)",
                color: typeFilter === s ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${typeFilter === s ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
                transition: "all 0.1s", textTransform: "capitalize",
              }}
            >{s}</button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ marginLeft: "auto", fontSize: 12, padding: "7px 14px" }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={13} /> Log Transaction
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading transaction history...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Client</th>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <DollarSign size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {transactions.length === 0 ? "No transaction records yet." : "No records match your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.$id}>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{t.description}</p>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{t.category || "General"}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
                        {t.client_id ? clientMap.get(t.client_id) : "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatDate(t.transaction_date)}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          color: TYPE_COLORS[t.type] || "var(--foreground-muted)"
                        }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: TYPE_COLORS[t.type] }}>
                        {t.type === "expense" || t.type === "refund" ? "−" : "+"}
                        {formatCurrency(t.amount, t.currency)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Log Transaction Modal ─── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowModal(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Log Transaction</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Add a new financial transaction</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground-muted)" }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Transaction Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["income", "expense", "advance", "refund"] as const).map((tType) => (
                    <button
                      key={tType}
                      type="button"
                      onClick={() => setType(tType)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${type === tType ? TYPE_COLORS[tType] : "var(--border)"}`,
                        background: type === tType ? `${TYPE_COLORS[tType]}10` : "var(--surface)",
                        color: type === tType ? TYPE_COLORS[tType] : "var(--foreground-muted)",
                        fontSize: 11, fontWeight: type === tType ? 700 : 400,
                        cursor: "pointer", textTransform: "capitalize",
                      }}
                    >{tType}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Amount (BDT) *</label>
                <input type="number" className="input-base" placeholder="Enter amount" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} required />
              </div>

              <div>
                <label style={labelStyle}>Description / Reference *</label>
                <input className="input-base" placeholder="e.g. Hosting Server Renewal Q3" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Server/Hosting">Server/Hosting</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Software License">Software License</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Salaries">Salaries</option>
                    <option value="General Income">General Income</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Transaction Date</label>
                  <input type="date" className="input-base" value={tDate} onChange={(e) => setTDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Related Client (Optional)</label>
                <select className="input-base" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">None</option>
                  {clients.map((c) => (
                    <option key={c.$id} value={c.$id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {saveStatus === "error" && (
                <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={saving}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> :
                   saveStatus === "saved" ? <Check size={13} /> : <Plus size={13} />}
                  {saving ? "Logging..." : saveStatus === "saved" ? "Logged!" : "Log Transaction"}
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
