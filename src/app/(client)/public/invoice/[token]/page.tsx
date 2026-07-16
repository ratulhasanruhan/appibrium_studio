"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Loader2, Printer, Check, Landmark, Smartphone } from "lucide-react";
import { getInvoiceByToken, getInvoiceItems } from "@/services/invoices";
import { getClient } from "@/services/crm";
import type { Invoice, Client, InvoiceItem } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { useParams } from "next/navigation";
import { databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";

export default function PublicInvoicePortal() {
  const params = useParams();
  const token  = params?.token as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client,  setClient]  = useState<Client | null>(null);
  const [items,   setItems]   = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      const inv = await getInvoiceByToken(token);
      if (inv) {
        setInvoice(inv);
        const [cl, lineItems, settingsRes] = await Promise.all([
          getClient(inv.client_id),
          getInvoiceItems(inv.$id),
          databases.listDocuments(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, [Query.limit(1)]),
        ]);
        setClient(cl);
        setItems(lineItems);

        if (settingsRes.documents.length > 0) {
          const doc = settingsRes.documents[0] as any;
          if (doc.bank_details) {
            try {
              const bd = typeof doc.bank_details === "string"
                ? JSON.parse(doc.bank_details)
                : doc.bank_details;
              setBankDetails(bd);
            } catch (_) {}
          }
        }
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

  const invoiceRef = `APP-INV-${new Date(invoice.$createdAt).getFullYear()}-${invoice.$id.slice(-4).toUpperCase()}`;
  const currency   = invoice.currency || "BDT";

  // Bank details state loaded from workspace settings

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    paid:      { bg: "#E6FAF3", color: "#00965C", label: "✓ Paid" },
    sent:      { bg: "#EEF4FF", color: "#3B72D4", label: "Awaiting Payment" },
    overdue:   { bg: "#FEF2F2", color: "#D14F4F", label: "⚠ Overdue" },
    draft:     { bg: "#F5F5F5", color: "#9CA3AF", label: "Draft" },
    cancelled: { bg: "#F5F5F5", color: "#9CA3AF", label: "Cancelled" },
  };
  const statusInfo = statusColors[invoice.status] ?? statusColors["draft"];

  return (
    <div className="invoice-portal">
      {/* ─── Header ─── */}
      <header className="inv-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_dark.svg" alt="Appibrium" style={{ height: 26, width: "auto" }} />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Jost', system-ui, sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Studio</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 6, background: "#00E090", border: "none", color: "#0D2317", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost', system-ui, sans-serif" }}
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
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6B8F7C", marginTop: 6 }}>{invoiceRef}</p>
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
              <span className="strip-value" style={{ color: invoice.status === "overdue" ? "#D14F4F" : undefined }}>
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
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317", fontFamily: "'Jost', sans-serif" }}>{invoice.title}</h1>
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
                <span>Total Due</span>
                <span>{formatCurrency(invoice.total, currency)}</span>
              </div>
              {invoice.status === "paid" && invoice.paid_at && (
                <div style={{ marginTop: 8, padding: "6px 12px", background: "#E6FAF3", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00965C", fontWeight: 600 }}>
                  <Check size={12} /> Paid on {formatDate(invoice.paid_at)}
                </div>
              )}
            </div>
          </div>

          {/* ─── Bank Details ─── */}
          {bankDetails && (
            <div style={{ padding: "0 40px 28px" }}>
              <div className="bank-section">
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0D2317", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Payment Instructions</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                      <Landmark size={11} /> Bank Transfer
                    </p>
                    {[
                      { k: "Account Name",   v: bankDetails.account_name },
                      { k: "Account Number", v: bankDetails.account_number },
                      { k: "Bank",           v: bankDetails.bank_name },
                      { k: "Branch",         v: bankDetails.branch },
                      { k: "Routing",        v: bankDetails.routing_number },
                    ].filter((r) => r.v).map((row) => (
                      <div key={row.k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: "#6B8F7C" }}>{row.k}</span>
                        <span style={{ fontWeight: 600, color: "#0D2317" }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const mobileList = Array.isArray(bankDetails.mobile_banking)
                      ? bankDetails.mobile_banking
                      : bankDetails.mobile_banking?.number
                        ? [bankDetails.mobile_banking]
                        : [];
                    if (mobileList.length === 0) return null;
                    return (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <Smartphone size={11} /> Mobile Banking
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {mobileList.map((mb: any, idx: number) => (
                            <div key={idx} style={{ padding: "10px 14px", background: "#F0FAF5", borderRadius: 8, border: "1px solid #D6EDE1" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#0D2317" }}>{mb.provider}</span>
                                {mb.type && (
                                  <span style={{ fontSize: 9, padding: "2px 6px", background: "#D6EDE1", color: "#00965C", borderRadius: 4, fontWeight: 600, textTransform: "uppercase" }}>
                                    {mb.type}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 14, fontWeight: 800, color: "#00965C", fontFamily: "'JetBrains Mono', monospace", marginTop: 3, marginBottom: 0 }}>
                                {mb.number}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ─── Notes ─── */}
          {invoice.notes && (
            <div style={{ padding: "0 40px 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Notes</p>
              <p style={{ fontSize: 12, color: "#1E3A27", lineHeight: 1.6 }}>{invoice.notes}</p>
            </div>
          )}

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

        .invoice-portal { min-height: 100vh; background: #EEF5F0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

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
          font-family: 'Jost', sans-serif;
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

        .bank-section {
          padding: 16px 20px; background: #F6FBF8;
          border: 1px solid #D6EDE1; border-radius: 8px;
        }

        .inv-doc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 40px;
          background: #F6FBF8; border-top: 1px solid #E8F2EC;
          font-size: 11px; color: #6B8F7C;
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
          .invoice-doc { max-width: 100%; border-radius: 0; box-shadow: none; border: none; }

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
