"use client";

import { useState, useEffect } from "react";
import { Search, Users, ExternalLink, Plus, Loader2, X, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getPeople, createPerson } from "@/services/people";
import { getEngagements } from "@/services/engagements";
import { getTransactions } from "@/services/transactions";
import { calcPersonFinancials, totalPayable } from "@/lib/finance";
import { PERSON_STATUS, statusStyle } from "@/lib/status";
import { formatCurrency, randomToken } from "@/utils";
import type { Person, Engagement, Transaction } from "@/types";

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};

export function PeopleList() {
  const [people, setPeople] = useState<Person[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<Person["type"]>("contractor");
  const [portfolio, setPortfolio] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<Person["payout_method"]>("bkash");
  const [payoutDetails, setPayoutDetails] = useState("");

  async function load() {
    try {
      const [ps, es, txs] = await Promise.all([getPeople(), getEngagements(), getTransactions()]);
      setPeople(ps);
      setEngagements(es);
      setPayouts(txs.filter((t) => t.person_id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    const res = await createPerson({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      role: role.trim() || undefined,
      type,
      status: "active",
      currency: "BDT",
      portfolio_url: portfolio.trim() || undefined,
      public_token: randomToken("tm"),
      payout_method: payoutMethod,
      payout_details: payoutDetails.trim() || undefined,
      joined_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (res.success) {
      setShowModal(false);
      setName(""); setEmail(""); setPhone(""); setRole(""); setPortfolio(""); setPayoutDetails("");
      load();
    } else {
      setError(res.error || "Failed to add person.");
    }
  }

  const outstanding = totalPayable(engagements, payouts);
  const activeCount = people.filter((p) => p.status === "active").length;

  const filtered = people.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Team Members", value: String(people.length), sub: `${activeCount} active`, color: "var(--foreground)" },
          { label: "Total Owed", value: formatCurrency(outstanding), sub: "Across all engagements", color: outstanding > 0 ? "#D14F4F" : "#00965C" },
          { label: "Engagements", value: String(engagements.filter((e) => e.status === "active").length), sub: "Currently active", color: "#3B72D4" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", boxShadow: "var(--shadow-xs)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--foreground-muted)", marginBottom: 6 }}>{s.label}</p>
            {loading
              ? <div style={{ height: 24, width: 70, background: "var(--surface)", borderRadius: 4 }} />
              : <p style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color: s.color }}>{s.value}</p>}
            <p style={{ fontSize: 10.5, color: "var(--foreground-muted)", marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 250 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
          <input className="input-base" placeholder="Search team..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "employee", "contractor", "intern"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{
                padding: "5px 12px", borderRadius: "var(--radius-md)", fontSize: 12, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: typeFilter === t ? 600 : 400, textTransform: "capitalize",
                background: typeFilter === t ? "var(--accent-subtle)" : "var(--background-alt)",
                color: typeFilter === t ? "var(--accent)" : "var(--foreground-muted)",
                border: `1px solid ${typeFilter === t ? "rgba(0,184,114,0.25)" : "var(--border)"}`,
              }}>{t}</button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft: "auto", fontSize: 12, padding: "7px 14px" }} onClick={() => setShowModal(true)}>
          <Plus size={13} /> Add Person
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> <span style={{ fontSize: 13 }}>Loading team...</span>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th><th>Role</th><th>Type</th><th>Assigned</th><th>Paid</th><th>Due</th><th>Status</th><th style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Users size={32} style={{ color: "var(--foreground-faint)" }} />
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                        {people.length === 0 ? "No team members yet. Add your first hire." : "No one matches your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const fin = calcPersonFinancials(
                  engagements.filter((e) => e.person_id === p.$id),
                  payouts.filter((t) => t.person_id === p.$id)
                );
                const st = statusStyle(PERSON_STATUS, p.status);
                return (
                  <tr key={p.$id}>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{p.name}</p>
                      {p.email && <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{p.email}</p>}
                    </td>
                    <td><span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{p.role || "—"}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--foreground-2)", textTransform: "capitalize" }}>{p.type}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--foreground-2)" }}>{formatCurrency(fin.agreed, p.currency)}</span></td>
                    <td><span style={{ fontSize: 12, color: "#00965C", fontWeight: 600 }}>{formatCurrency(fin.paid, p.currency)}</span></td>
                    <td><span style={{ fontSize: 12, fontWeight: fin.due > 0 ? 700 : 400, color: fin.due > 0 ? "#D14F4F" : "var(--foreground-muted)" }}>{formatCurrency(fin.due, p.currency)}</span></td>
                    <td>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, textTransform: "capitalize" }}>{p.status}</span>
                    </td>
                    <td>
                      <Link href={`/people/${p.$id}`} title="Open" style={{ color: "var(--foreground-faint)", display: "flex", padding: 4 }}>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add person modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowModal(false)} />
          <form onSubmit={handleCreate} style={{ position: "relative", width: "100%", maxWidth: 500, background: "var(--background-alt)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 24, boxShadow: "var(--shadow-xl)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>Add Team Member</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Staff, contractor, or intern you pay</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)" }}><X size={16} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Full Name *</label>
                <input className="input-base" style={{ fontSize: 12 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Md. Rahim Uddin" required />
              </div>
              <div>
                <label style={labelStyle}>Role / Title</label>
                <input className="input-base" style={{ fontSize: 12 }} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Engagement Type</label>
                <select className="input-base" style={{ fontSize: 12 }} value={type} onChange={(e) => setType(e.target.value as Person["type"])}>
                  <option value="contractor">Contractor</option>
                  <option value="employee">Employee</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="input-base" type="email" style={{ fontSize: 12 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahim@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="input-base" style={{ fontSize: 12 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801..." />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Portfolio / Profile Link (Optional)</label>
                <input className="input-base" style={{ fontSize: 12 }} value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://dribbble.com/username" />
              </div>
              <div>
                <label style={labelStyle}>Payout Method</label>
                <select className="input-base" style={{ fontSize: 12 }} value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as Person["payout_method"])}>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Account / Number</label>
                <input className="input-base" style={{ fontSize: 12 }} value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)} placeholder="01712345678" />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#D14F4F", background: "#FEF2F2", border: "1px solid #FAC5C5", padding: "8px 12px", borderRadius: "var(--radius-md)" }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", fontSize: 12 }} disabled={saving}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
                {saving ? "Adding..." : "Add Person"}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
