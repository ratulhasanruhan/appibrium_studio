"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Loader2, Printer, Briefcase, Wallet, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { calcPersonFinancials, isOutflow } from "@/lib/finance";
import { COMPANY } from "@/lib/company-profile";
type CompanyDetails = { name: string; address: string; email: string; phone: string; website: string; logo_url: string };
import { formatDate, formatCurrency } from "@/utils";
import type { Person, Engagement, Transaction, Project } from "@/types";

export default function TeamReportPage() {
  const params = useParams();
  const token = params?.token as string;

  const [person, setPerson] = useState<Person | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/public?type=team&token=${encodeURIComponent(token)}`);
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        setPerson(data.person);
        setEngagements(data.engagements || []);
        setPayouts(data.payouts || []);
        setProjects(data.projects || []);
        setCompany({
          name: data.company?.name || COMPANY.name,
          address: data.company?.address || COMPANY.address,
          email: data.company?.email || COMPANY.email,
          phone: data.company?.phone || "",
          website: data.company?.website || COMPANY.website,
          logo_url: data.company?.logo_url || "",
        });
      }
      setLoading(false);
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="tr-state">
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <p>Loading your report...</p>
        <style>{`.tr-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#F4FBF7;gap:14px;font-family:system-ui,sans-serif}.tr-state p{font-size:13px;color:#6B8F7C}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!person || !company) {
    return (
      <div className="tr-state">
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317" }}>Report Not Found</h1>
        <p>This link may be invalid or has been withdrawn.</p>
        <style>{`.tr-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#F4FBF7;gap:14px;font-family:system-ui,sans-serif}.tr-state p{font-size:13px;color:#6B8F7C}`}</style>
      </div>
    );
  }

  const currency = person.currency || "BDT";
  const fin = calcPersonFinancials(engagements, payouts);
  const projectName = (pid?: string) => projects.find((p) => p.$id === pid)?.name;
  const paidFor = (e: Engagement) =>
    payouts.filter((t) => t.engagement_id === e.$id && isOutflow(t)).reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="tr-page">
      <header className="tr-bar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_dark.svg" alt="Appibrium" style={{ height: 26 }} />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Jost', 'Noto Sans Bengali', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Studio</span>
        </div>
        <button onClick={() => window.print()} className="tr-print"><Printer size={13} /> Download PDF</button>
      </header>

      <main className="tr-main">
        <div className="tr-sheet">
          <div className="tr-head">
            <div>
              <p className="tr-eyebrow">Work &amp; Payment Report</p>
              <h1 className="tr-name">{person.name}</h1>
              {person.role && <p className="tr-role">{person.role}</p>}
            </div>
            <div className="tr-co">
              <p className="tr-co-name">{company.name}</p>
              <p>{company.address}</p>
              <p>as of {formatDate(new Date())}</p>
            </div>
          </div>
          <div className="tr-rule" />

          <div className="tr-stats">
            {[
              { label: "Total Assigned", value: fin.agreed, color: "#0D2317", icon: Briefcase },
              { label: "Total Received", value: fin.paid, color: "#00965C", icon: TrendingUp },
              { label: "Outstanding", value: fin.due, color: fin.due > 0 ? "#D14F4F" : "#00965C", icon: Wallet },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="tr-stat">
                <span className="tr-stat-k"><Icon size={11} /> {label}</span>
                <span className="tr-stat-v" style={{ color }}>{formatCurrency(value, currency)}</span>
              </div>
            ))}
          </div>

          {fin.agreed > 0 && (
            <div className="tr-progress">
              <div className="tr-progress-top">
                <span>Settled</span><strong>{fin.settledPct}%</strong>
              </div>
              <div className="tr-track"><div className="tr-fill" style={{ width: `${fin.settledPct}%` }} /></div>
            </div>
          )}

          <h2 className="tr-h2">Your Assignments</h2>
          {engagements.length === 0 ? (
            <p className="tr-empty">No assignments recorded yet.</p>
          ) : (
            <div className="tr-scroll"><table className="tr-table">
              <thead>
                <tr><th>Work</th><th>Project</th><th className="r">Budget</th><th className="r">Paid</th><th className="r">Due</th></tr>
              </thead>
              <tbody>
                {engagements.map((e) => {
                  const paid = paidFor(e);
                  const due = Math.max(e.agreed_amount - paid, 0);
                  return (
                    <tr key={e.$id}>
                      <td><strong>{e.title}</strong>{e.start_date && <p className="tr-sub">from {formatDate(e.start_date)}</p>}</td>
                      <td>{projectName(e.project_id) || "—"}</td>
                      <td className="r">{formatCurrency(e.agreed_amount, e.currency || currency)}</td>
                      <td className="r" style={{ color: "#00965C" }}>{formatCurrency(paid, currency)}</td>
                      <td className="r" style={{ color: due > 0 ? "#D14F4F" : "#6B8F7C", fontWeight: due > 0 ? 700 : 400 }}>{formatCurrency(due, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}

          <h2 className="tr-h2">Payments Received</h2>
          {payouts.length === 0 ? (
            <p className="tr-empty">No payments recorded yet.</p>
          ) : (
            <div className="tr-scroll"><table className="tr-table">
              <thead>
                <tr><th>Description</th><th>Project</th><th>Date</th><th className="r">Amount</th></tr>
              </thead>
              <tbody>
                {payouts.map((t) => (
                  <tr key={t.$id}>
                    <td>{t.description}</td>
                    <td>{projectName(t.project_id) || "—"}</td>
                    <td>{formatDate(t.transaction_date)}</td>
                    <td className="r" style={{ color: "#00965C", fontWeight: 600 }}>{formatCurrency(t.amount, t.currency || currency)}</td>
                  </tr>
                ))}
                <tr className="tr-total">
                  <td colSpan={3}>Total received</td>
                  <td className="r">{formatCurrency(fin.paid, currency)}</td>
                </tr>
              </tbody>
            </table></div>
          )}

          <footer className="tr-foot">
            <span>{company.name} · {company.email}</span>
            <span>Questions about this report? Reply to your last payment email.</span>
          </footer>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .tr-page { min-height: 100vh; background: #EEF5F0; font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', system-ui, sans-serif; overflow-x: hidden; }
        .tr-scroll { margin: 0; }
        .tr-bar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 56px; background: #0D2317; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
        .tr-print { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #00E090; border: none; color: #0D2317; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; }
        .tr-main { padding: 36px 20px 60px; }
        .tr-sheet { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 8px 40px rgba(13,35,23,0.12), 0 0 0 1px rgba(13,35,23,0.06); padding: 40px 46px 28px; }

        .tr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        .tr-eyebrow { font-size: 10px; font-weight: 700; color: #00965C; text-transform: uppercase; letter-spacing: 0.09em; }
        .tr-name { font-size: 22px; font-weight: 800; color: #0D2317; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; letter-spacing: -0.02em; margin-top: 4px; }
        .tr-role { font-size: 13px; color: #6B8F7C; margin-top: 2px; }
        .tr-co { text-align: right; font-size: 11px; color: #6B8F7C; line-height: 1.7; }
        .tr-co-name { font-size: 12.5px; font-weight: 700; color: #0D2317; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; }
        .tr-rule { height: 2.5px; margin: 16px 0 22px; background: linear-gradient(90deg, #00B872 0%, #00E090 55%, transparent 100%); }

        .tr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .tr-stat { padding: 14px 16px; border: 1px solid #E3EEE8; border-radius: 10px; background: #FAFCFA; }
        .tr-stat-k { display: flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.06em; }
        .tr-stat-v { display: block; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin-top: 6px; }

        .tr-progress { margin-top: 14px; padding: 12px 16px; border: 1px solid #E3EEE8; border-radius: 10px; }
        .tr-progress-top { display: flex; justify-content: space-between; font-size: 11.5px; color: #6B8F7C; margin-bottom: 8px; }
        .tr-progress-top strong { color: #00965C; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; }
        .tr-track { height: 7px; border-radius: 99px; background: #F0FAF5; border: 1px solid #E3EEE8; overflow: hidden; }
        .tr-fill { height: 100%; background: linear-gradient(90deg,#00B872,#00E090); border-radius: 99px; }

        .tr-h2 { font-size: 13px; font-weight: 700; color: #0D2317; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; margin: 28px 0 10px; padding-left: 9px; border-left: 3px solid #00B872; }
        .tr-empty { font-size: 12px; color: #6B8F7C; padding: 6px 0 4px; }

        .tr-table { width: 100%; border-collapse: collapse; border: 1px solid #E3EEE8; border-radius: 8px; overflow: hidden; }
        .tr-table th { background: #F6FBF8; padding: 9px 14px; text-align: left; font-size: 9.5px; font-weight: 700; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E3EEE8; }
        .tr-table td { padding: 11px 14px; border-bottom: 1px solid #F0F7F3; font-size: 12.5px; color: #1E3A27; }
        .tr-table tbody tr:last-child td { border-bottom: none; }
        .tr-table .r { text-align: right; }
        .tr-sub { font-size: 10px; color: #9CB4A8; font-weight: 400; margin-top: 2px; }
        .tr-total td { background: #F6FBF8; font-weight: 800; font-family: 'Jost', 'Noto Sans Bengali', sans-serif; color: #0D2317; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
        .tr-total td.r { font-size: 13px; color: #00965C; text-transform: none; letter-spacing: 0; }

        .tr-foot { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 34px; padding-top: 12px; border-top: 1px solid #E8F2EC; font-size: 10px; color: #9CB4A8; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ─── Mobile ─── */
        @media (max-width: 640px) {
          .tr-bar { padding: 0 12px; height: 52px; }
          .tr-bar img { height: 20px; }
          .tr-main { padding: 14px 10px 40px; }
          .tr-sheet { border-radius: 8px; padding: 22px 16px 20px; }

          .tr-head { flex-direction: column; gap: 10px; }
          .tr-co { text-align: left; }
          .tr-name { font-size: 19px; }
          .tr-stats { grid-template-columns: 1fr; gap: 8px; }
          .tr-stat { padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; }
          .tr-stat-v { margin-top: 0; font-size: 17px; }

          /* wide tables scroll inside their own box instead of the page */
          .tr-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .tr-table { min-width: 460px; }
          .tr-table th, .tr-table td { padding: 9px 10px; font-size: 12px; }
          .tr-foot { flex-direction: column; align-items: flex-start; gap: 5px; }
        }

        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .tr-main { padding: 0 !important; }
          .tr-sheet { max-width: 100%; border-radius: 0; box-shadow: none; padding: 0; }
          .tr-stat, .tr-table, .tr-fill, .tr-rule, .tr-total td, .tr-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tr-table, .tr-stats { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
