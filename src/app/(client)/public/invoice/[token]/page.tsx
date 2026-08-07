"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Loader2, Printer, Check, Copy } from "lucide-react";
import type { Invoice, Client, InvoiceItem } from "@/types";
import { formatDate, formatCurrency, documentRef } from "@/utils";
import { effectiveInvoiceStatus } from "@/lib/finance";
import { useParams } from "next/navigation";

export default function PublicInvoicePortal() {
  const params = useParams();
  const token  = params?.token as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client,  setClient]  = useState<Client | null>(null);
  const [items,   setItems]   = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(field: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
    });
  }

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      const res = await fetch(`/api/public?type=invoice&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        setClient(data.client);
        setItems(data.items || []);
        setBankDetails(data.bank);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7", gap: 14 }}>
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#6B8F7C", fontFamily: "system-ui, sans-serif" }}>Loading invoice...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7", gap: 16 }}>
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317", fontFamily: "system-ui, sans-serif" }}>Invoice Not Found</h1>
        <p style={{ fontSize: 13, color: "#6B8F7C" }}>This link may be invalid or the invoice has been removed.</p>
      </div>
    );
  }

  const invoiceRef = documentRef("APP-INV", invoice.$createdAt, invoice.$id);
  const currency   = invoice.currency || "BDT";

  // Bank details state loaded from workspace settings

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    paid:      { bg: "#E6FAF3", color: "#00965C", label: "✓ Paid" },
    sent:      { bg: "#EEF4FF", color: "#3B72D4", label: "Awaiting Payment" },
    overdue:   { bg: "#FEF2F2", color: "#D14F4F", label: "⚠ Overdue" },
    draft:     { bg: "#F5F5F5", color: "#9CA3AF", label: "Draft" },
    cancelled: { bg: "#F5F5F5", color: "#9CA3AF", label: "Cancelled" },
  };
  const shownStatus = effectiveInvoiceStatus(invoice);
  const statusInfo = statusColors[shownStatus] ?? statusColors["draft"];

  return (
    <div className="invoice-portal">
      {/* ─── Header ─── */}
      <header className="inv-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_dark.svg" alt="Appibrium" style={{ height: 26, width: "auto" }} />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Jost', 'Noto Sans Bengali', system-ui, sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Studio</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 6, background: "#00E090", border: "none", color: "#0D2317", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost', 'Noto Sans Bengali', system-ui, sans-serif" }}
        >
          <Printer size={13} /> Download PDF
        </button>
      </header>

      {/* ─── Document ─── */}
      <main className="inv-main">
        <div className="invoice-doc">

          {/* PDF-only elements */}
          <div className="pdf-watermark">
            <img src="/branding_assets/logos/icon/icon_mint.svg" alt="" />
          </div>


          {/* ─── Document Header ─── */}
          <div className="inv-doc-header">
            <div>
              <div className="inv-badge">INVOICE</div>
              <p style={{ fontFamily: "'JetBrains Mono', 'Noto Sans Bengali', monospace", fontSize: 12, color: "#6B8F7C", marginTop: 6 }}>{invoiceRef}</p>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <img src="/branding_assets/logos/lockup/appibrium_w4_light.png" alt="Appibrium" style={{ height: 48, width: "auto", display: "block", marginLeft: "auto", marginRight: 0, marginBottom: 6 }} />
              <p style={{ fontSize: 11, color: "#0D2317", fontWeight: 700 }}>Appibrium Technology Co.</p>
              <p style={{ fontSize: 11, color: "#6B8F7C" }}>23/A Shukrabad, Dhaka, Bangladesh</p>
            </div>
          </div>

          <div className="inv-accent-line" />

          {/* ─── Billing & Details Strip ─── */}
          <div className="inv-strip">
            <div className="inv-strip-item">
              <span className="strip-label">Billed To</span>
              <span className="strip-value">{client?.name || "Valued Client"}</span>
              {client?.email    && <span className="strip-sub">{client.email}</span>}
              {client?.address  && <span className="strip-sub">{client.address}</span>}
            </div>
            <div className="inv-strip-item">
              <span className="strip-label">Issue Date</span>
              <span className="strip-value">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="inv-strip-item">
              <span className="strip-label">Due Date</span>
              <span className="strip-value" style={{ color: shownStatus === "overdue" ? "#D14F4F" : undefined }}>
                {formatDate(invoice.due_date)}
              </span>
            </div>
            <div className="inv-strip-item">
              <span className="strip-label">Status</span>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: statusInfo.bg, color: statusInfo.color, marginTop: 2 }}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* ─── Title ─── */}
          <div style={{ padding: "24px 40px 0" }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317", fontFamily: "'Jost', 'Noto Sans Bengali', sans-serif" }}>{invoice.title}</h1>
          </div>

          {/* ─── Line Items ─── */}
          <div style={{ padding: "20px 40px" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Description</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Unit Price</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "#6B8F7C", fontSize: 12 }}>
                      No line items on record.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.$id}>
                      <td style={{ color: "#1E3A27" }}>{item.description}</td>
                      <td style={{ textAlign: "center", color: "#6B8F7C" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", color: "#6B8F7C" }}>{formatCurrency(item.unit_price, currency)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "#0D2317" }}>{formatCurrency(item.amount, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Totals ─── */}
          <div className="inv-totals-wrap">
            <div className="inv-totals">
              {[
                { label: "Subtotal",  value: invoice.subtotal },
                { label: "Discount",  value: -invoice.discount },
                { label: "Tax",       value: invoice.tax },
              ].filter((r) => r.value !== 0).map((row) => (
                <div key={row.label} className="totals-row">
                  <span>{row.label}</span>
                  <span>{row.label === "Discount" ? `−${formatCurrency(Math.abs(row.value), currency)}` : formatCurrency(row.value, currency)}</span>
                </div>
              ))}
              <div className="totals-row totals-final">
                <span>{invoice.status === "paid" ? "Total" : "Total Due"}</span>
                <span>{formatCurrency(invoice.total, currency)}</span>
              </div>
              {invoice.status === "paid" && invoice.paid_at && (
                <div style={{ marginTop: 8, padding: "6px 12px", background: "#E6FAF3", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00965C", fontWeight: 600 }}>
                  <Check size={12} /> Paid on {formatDate(invoice.paid_at)}
                </div>
              )}
            </div>
          </div>

          {/* ─── Notes ─── */}
          {invoice.notes && (
            <div style={{ padding: "0 40px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Notes</p>
              <p style={{ fontSize: 12, color: "#1E3A27", lineHeight: 1.6 }}>{invoice.notes}</p>
            </div>
          )}

          {/* ─── Payment Instructions (always last, directly above the footer) ─── */}
          {bankDetails && (() => {
            const bankRows = [
              { k: "Account Name",   v: bankDetails.account_name },
              { k: "Account Number", v: bankDetails.account_number, copy: true },
              { k: "Bank",           v: bankDetails.bank_name },
              { k: "Branch",         v: bankDetails.branch },
              { k: "Routing Number", v: bankDetails.routing_number, copy: true },
            ].filter((r) => r.v);

            const mobileList = Array.isArray(bankDetails.mobile_banking)
              ? bankDetails.mobile_banking
              : bankDetails.mobile_banking?.number
                ? [bankDetails.mobile_banking]
                : [];

            if (bankRows.length === 0 && mobileList.length === 0) return null;

            return (
              <div className="payment-section" style={{ padding: "28px 40px 28px" }}>
                <div className="payment-card">
                  <div className="payment-card-header">
                    <span className="payment-card-title">Payment Instructions</span>
                    <span className="payment-card-note">Reference <strong>{invoiceRef}</strong> with your payment</span>
                  </div>
                  <div className="payment-methods">
                    {bankRows.length > 0 && (
                      <div className="payment-method">
                        <p className="payment-method-label">Bank Transfer</p>
                        {bankRows.map((row) => (
                          <div key={row.k} className="payment-row">
                            <span className="payment-row-label">{row.k}</span>
                            <span className="payment-row-value">
                              {row.v}
                              {row.copy && (
                                <button
                                  type="button"
                                  className="copy-btn no-print"
                                  onClick={() => copyToClipboard(row.k, row.v)}
                                  aria-label={`Copy ${row.k}`}
                                >
                                  {copiedField === row.k ? <Check size={10} /> : <Copy size={10} />}
                                </button>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {mobileList.length > 0 && (
                      <div className="payment-method">
                        <p className="payment-method-label">Mobile Banking</p>
                        {mobileList.map((mb: any, idx: number) => (
                          <div key={idx} className="payment-row">
                            <span className="payment-row-label">{mb.provider}{mb.type ? ` (${mb.type})` : ""}</span>
                            <span className="payment-row-value">
                              {mb.number}
                              <button
                                type="button"
                                className="copy-btn no-print"
                                onClick={() => copyToClipboard(`mobile-${idx}`, mb.number)}
                                aria-label={`Copy ${mb.provider} number`}
                              >
                                {copiedField === `mobile-${idx}` ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ─── Footer ─── */}
          <div className="inv-doc-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/branding_assets/logos/icon/icon_mint.svg" alt="" style={{ width: 16, height: 16, opacity: 0.5 }} />
              <span>© {new Date().getFullYear()} Appibrium Technology Co. · All rights reserved · appibrium.com</span>
            </div>
            <span>Thank you for your business.</span>
          </div>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .invoice-portal { min-height: 100vh; background: #EEF5F0; font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', system-ui, sans-serif; overflow-x: hidden; }

        .inv-header {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; height: 56px;
          background: #0D2317;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }

        .inv-main { padding: 36px 20px 60px; }

        .invoice-doc {
          position: relative; max-width: 860px; margin: 0 auto;
          background: #fff; border-radius: 12px;
          box-shadow: 0 8px 40px rgba(13,35,23,0.12), 0 0 0 1px rgba(13,35,23,0.06);
          overflow: hidden;
        }

        .inv-doc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 32px 40px 24px;
          background: #FAFCFA; border-bottom: 1px solid #E8F2EC;
        }

        .inv-badge {
          display: inline-block;
          color: #0D2317;
          font-size: 14px; font-weight: 800;
          letter-spacing: 0.14em;
          font-family: 'Jost', 'Noto Sans Bengali', sans-serif;
        }

        .inv-accent-line { height: 3px; background: linear-gradient(90deg, #00B872 0%, #00E090 60%, transparent 100%); }

        .inv-strip {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #E8F2EC;
          padding: 0 40px;
        }
        .inv-strip-item {
          padding: 16px 0; border-right: 1px solid #E8F2EC;
          display: flex; flex-direction: column; gap: 3px;
        }
        .inv-strip-item:not(:last-child) {
          padding-right: 16px;
        }
        .inv-strip-item:not(:first-child) {
          padding-left: 16px;
        }
        .inv-strip-item:last-child { border-right: none; }
        .strip-label { font-size: 10px; font-weight: 600; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
        .strip-value { font-size: 13px; font-weight: 600; color: #0D2317; }
        .strip-sub   { font-size: 11px; color: #6B8F7C; }

        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table th {
          background: #F0FAF5; padding: 9px 12px;
          text-align: left; font-size: 10px; font-weight: 700;
          color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 2px solid #D6EDE1;
        }
        .inv-table td { padding: 11px 12px; border-bottom: 1px solid #F0FAF5; font-size: 13px; }
        .inv-table th:first-child, .inv-table td:first-child { padding-left: 0; }
        .inv-table th:last-child, .inv-table td:last-child { padding-right: 0; }
        .inv-table tbody tr:last-child td { border-bottom: none; }
        .inv-table tbody tr:hover td { background: #F9FFFC; }

        .inv-totals-wrap { display: flex; justify-content: flex-end; padding: 8px 40px 24px; }
        .inv-totals { min-width: 260px; }
        .totals-row { display: flex; justify-content: space-between; font-size: 12px; color: #6B8F7C; padding: 5px 0; border-bottom: 1px solid #F0FAF5; }
        .totals-final {
          font-size: 15px; font-weight: 800; color: #0D2317;
          padding: 10px 0; border-top: 2px solid #00B872; border-bottom: none; margin-top: 4px;
        }

        .payment-card {
          border: 1.5px solid #D6EDE1; border-radius: 8px;
          background: #fff;
        }
        .payment-card-header {
          display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 2px 16px;
          padding: 12px 18px; background: #F6FBF8;
          border-bottom: 1px solid #D6EDE1;
          border-radius: 7px 7px 0 0;
        }
        .payment-card-title {
          font-size: 11px; font-weight: 700; color: #0D2317;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .payment-card-note { font-size: 11px; color: #6B8F7C; }
        .payment-card-note strong { color: #0D2317; font-weight: 700; }

        .payment-methods {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0 24px; padding: 14px 18px;
        }
        .payment-method:not(:last-child) { border-right: 1px solid #EDF6F1; padding-right: 24px; }
        .payment-method-label {
          font-size: 10px; font-weight: 700; color: #6B8F7C;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .payment-row {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 5px 0; font-size: 12px;
          border-bottom: 1px solid #F0FAF5;
        }
        .payment-row:last-child { border-bottom: none; }
        .payment-row-label { color: #6B8F7C; flex-shrink: 0; }
        .payment-row-value {
          display: flex; align-items: center; gap: 5px;
          font-weight: 600; color: #1E3A27;
          font-family: 'JetBrains Mono', 'Noto Sans Bengali', monospace; font-size: 11px; letter-spacing: 0.01em;
          text-align: right;
        }

        .copy-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; padding: 0; flex-shrink: 0;
          background: none; border: none;
          color: #9CB4A8; cursor: pointer;
        }
        .copy-btn:hover { color: #00965C; }

        .inv-doc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 40px;
          background: #F6FBF8; border-top: 1px solid #E8F2EC;
          font-size: 11px; color: #6B8F7C;
        }

        /* ─── Mobile ─── */
        @media (max-width: 640px) {
          .inv-header { padding: 0 14px; height: 52px; }
          .inv-header img { height: 20px; }
          .inv-main { padding: 14px 10px 40px; }
          .invoice-doc { border-radius: 8px; }

          .inv-doc-header { flex-direction: column; align-items: flex-start; gap: 14px; padding: 20px 18px 16px; }
          .inv-doc-header > div:last-child { text-align: left !important; align-items: flex-start !important; }
          .inv-doc-header img { margin-left: 0 !important; height: 34px !important; }

          /* four columns of meta do not fit a phone — go two-up */
          .inv-strip { grid-template-columns: 1fr 1fr; padding: 0 18px; }
          .inv-strip-item { border-right: none; padding: 12px 0 !important; }
          .inv-strip-item:nth-child(odd) { padding-right: 12px !important; }
          .inv-strip-item:not(:first-child) { padding-left: 0 !important; }
          .inv-strip-item:nth-child(-n+2) { border-bottom: 1px solid #E8F2EC; }

          .invoice-doc h1 { font-size: 16px !important; }
          .invoice-doc > div[style*="24px 40px 0"] { padding: 18px 18px 0 !important; }

          /* line items: drop unit price, keep qty x amount readable */
          .inv-table { font-size: 12px; }
          .inv-table th:nth-child(3), .inv-table td:nth-child(3) { display: none; }
          .inv-table th, .inv-table td { padding: 9px 6px; }
          .inv-table th:first-child, .inv-table td:first-child { padding-left: 0; }

          .inv-totals-wrap { padding: 4px 18px 18px; }
          .inv-totals { min-width: 0; width: 100%; }

          .payment-methods { grid-template-columns: 1fr; gap: 0; }
          .payment-method:not(:last-child) { border-right: none; border-bottom: 1px solid #EDF6F1; padding-right: 0; padding-bottom: 12px; margin-bottom: 4px; }
          .payment-card-header { flex-direction: column; align-items: flex-start; gap: 4px; }
          .payment-row { gap: 8px; }
          .payment-row-value { font-size: 10.5px; }

          .inv-doc-footer { flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px 18px; }
        }

        /* PDF / Print */
        .pdf-watermark { display: none; }
        .pdf-header    { display: none; }
        .pdf-footer    { display: none; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media print {
          @page { size: A4; margin: 18mm 14mm 20mm 14mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .inv-main { padding: 0 !important; }
          .invoice-doc {
            max-width: 100%; border-radius: 0; box-shadow: none; border: none;
            display: flex; flex-direction: column;
            min-height: calc(297mm - 38mm); /* A4 height minus @page top+bottom margin */
          }
          /* Pins payment instructions (and the footer right after it) to the
             bottom of the printed A4 page instead of following content flow. */
          .payment-section { margin-top: auto; }

          .pdf-watermark {
            display: flex !important; position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none; z-index: 0;
            opacity: 0.035;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            justify-content: center;
            align-items: center;
          }
          .pdf-watermark img {
            width: 320px;
            height: auto;
          }


        }
      `}</style>
    </div>
  );
}
