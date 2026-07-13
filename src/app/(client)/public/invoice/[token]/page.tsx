"use client";

import React, { useState, useEffect } from "react";
import { Download, CreditCard, ShieldCheck, ShieldAlert, Landmark, Smartphone, Loader2 } from "lucide-react";
import { getInvoices } from "@/services/invoices";
import { getClient } from "@/services/crm";
import type { Invoice, Client, BankDetails } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { useParams } from "next/navigation";

const DEFAULT_BANK: BankDetails = {
  account_name:   "Appibrium Technology Co.",
  account_number: "102.120.45678",
  bank_name:      "Dutch-Bangla Bank PLC",
  branch:         "Shukrabad Branch, Dhaka",
  routing_number: "090273412",
  mobile_banking: { provider: "bKash (Personal)", number: "01711000000" },
};

export default function PublicInvoicePortal() {
  const params = useParams();
  const token = params?.token as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock invoice items since we aren't using sub-collection queries in mock
  const [items] = useState([
    { description: "E-Commerce Re-platforming — Milestone 1 (Design Sign-off)", quantity: 1, unit_price: 45000, amount: 45000 },
    { description: "Database Integration & Schema Provisioning", quantity: 1, unit_price: 35000, amount: 35000 },
  ]);

  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const fullHtml = `
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #0D2317; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00B872; padding-bottom: 10px; margin-bottom: 20px; }
              .title { font-size: 20px; font-weight: 700; }
              .section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th { background: #EBF7F1; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
              .table td { padding: 8px; border-bottom: 1px solid #E7F4EE; font-size: 12px; }
              .total-sec { display: flex; justify-content: flex-end; }
              .bank-info { margin-top: 30px; background: #F4FBF7; border: 1px solid #D6EDE1; padding: 15px; border-radius: 8px; font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">INVOICE</div>
                <p style="font-size: 11px; color: #6B8F7C;">INV-${invoice.$id.toUpperCase()}</p>
              </div>
              <div style="text-align: right; font-size: 11px;">
                <strong>Appibrium Technology Co.</strong>
                <p>23/A Shukrabad, Dhaka</p>
              </div>
            </div>

            <div class="section">
              <div>
                <strong>Billed To:</strong>
                <p style="font-size: 12px; margin-top: 4px;">${client?.name || "Valued Client"}</p>
                <p style="font-size: 11px; color: #6B8F7C;">${client?.address || ""}</p>
              </div>
              <div style="text-align: right; font-size: 11px;">
                <p>Issue Date: ${formatDate(invoice.issue_date)}</p>
                <p>Due Date: ${formatDate(invoice.due_date)}</p>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: right;">${item.quantity}</td>
                    <td style="text-align: right;">৳${item.unit_price}</td>
                    <td style="text-align: right;">৳${item.amount}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="total-sec">
              <div style="width: 200px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Subtotal:</span>
                  <span>৳${invoice.subtotal}</span>
                </div>
                ${
                  invoice.discount > 0
                    ? `
                <div style="display: flex; justify-content: space-between; color: #D14F4F;">
                  <span>Discount:</span>
                  <span>-৳${invoice.discount}</span>
                </div>
                `
                    : ""
                }
                <hr style="border: 0; border-top: 1px solid #D6EDE1; margin: 8px 0;" />
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                  <span>Total:</span>
                  <span>৳${invoice.total}</span>
                </div>
              </div>
            </div>

            <div class="bank-info">
              <strong style="font-size: 12px; color: #0D2317;">Bank Transfer Instructions</strong>
              <p style="margin-top: 6px;">Bank: ${bank.bank_name}</p>
              <p>Account Name: ${bank.account_name}</p>
              <p>Account Number: ${bank.account_number}</p>
              <p>Branch: ${bank.branch}</p>
              <p>Routing Number: ${bank.routing_number}</p>
              ${
                bank.mobile_banking?.number
                  ? `<p style="margin-top: 6px; font-weight: 600; color: #00B872;">${bank.mobile_banking.provider}: ${bank.mobile_banking.number}</p>`
                  : ""
              }
            </div>
          </body>
        </html>
      `;

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: fullHtml,
          filename: `invoice_${invoice.$id}.pdf`,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invoice.$id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      alert("Failed to download PDF. Falling back to browser print.");
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      const allInvoices = await getInvoices();
      const found = allInvoices.find((i) => i.public_token === token) || allInvoices[0];
      if (found) {
        setInvoice(found);
        const cl = await getClient(found.client_id);
        setClient(cl);
      }
      setLoading(false);
    }
    if (token) {
      loadInvoice();
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", color: "var(--foreground-muted)" }}>
        <p>Loading invoice portal...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", gap: 14 }}>
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <p style={{ color: "var(--foreground-muted)" }}>Invalid token or invoice not found.</p>
      </div>
    );
  }

  const bank = invoice.bank_details ?? DEFAULT_BANK;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Action Header */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/branding_assets/logos/icon/icon_mint.svg" alt="Appibrium" style={{ width: 28, height: 28 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <img src="/branding_assets/logos/wordmark/wordmark_dark.svg" alt="Appibrium" style={{ height: 13, width: "auto" }} />
              <div style={{ width: 1, height: 10, background: "var(--border)" }} />
              <span className="studio-mark" style={{ fontSize: 10 }}>Studio</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
              ) : (
                <><Download size={13} /> Download PDF</>
              )}
            </button>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

          {/* ─── Main Invoice ─── */}
          <div className="card" style={{ padding: "40px", minHeight: 600, display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
              <div>
                <span className={`badge badge-${invoice.status}`} style={{ textTransform: "capitalize", fontSize: 12, padding: "4px 12px" }}>
                  {invoice.status}
                </span>
                <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-heading)", marginTop: 12 }}>Invoice Details</h1>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                  APP-INV-{new Date(invoice.$createdAt).getFullYear()}-{invoice.$id.toUpperCase()}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, fontWeight: 700 }}>Appibrium Technology Co.</p>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>23/A Shukrabad, Dhaka</p>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>hello@appibrium.com</p>
              </div>
            </div>

            {/* Billing addresses */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>Billed To</span>
                <p style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{client?.name || "Valued Client"}</p>
                {client?.address && <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginTop: 2, lineHeight: 1.5 }}>{client.address}</p>}
                {client?.email && <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginTop: 2 }}>{client.email}</p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-block", textAlign: "left" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 120px", gap: "8px 12px", fontSize: 12 }}>
                    <span style={{ color: "var(--foreground-muted)" }}>Issue Date:</span>
                    <span style={{ fontWeight: 500 }}>{formatDate(invoice.issue_date)}</span>
                    <span style={{ color: "var(--foreground-muted)" }}>Due Date:</span>
                    <span style={{ fontWeight: 600, color: invoice.status === "overdue" ? "#D14F4F" : "inherit" }}>{formatDate(invoice.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 60 }}>Qty</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 100 }}>Unit</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 110 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "10px 12px", color: "var(--foreground-2)" }}>{item.description}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)" }}>{item.quantity}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground-muted)" }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{formatCurrency(item.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total summary */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
              <div style={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--foreground-muted)" }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--foreground-muted)" }}>
                    <span>Discount</span>
                    <span style={{ color: "#D14F4F" }}>-{formatCurrency(invoice.discount, invoice.currency)}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--accent)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Sidebar: Manual Payment details ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Bank details card */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Landmark size={15} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Bank Transfer</h2>
              </div>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5 }}>
                Please transfer the invoice total manually to the following bank account.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
                {[
                  { label: "Account Name", value: bank.account_name },
                  { label: "Account No.",  value: bank.account_number },
                  { label: "Bank Name",    value: bank.bank_name },
                  { label: "Branch",       value: bank.branch },
                  { label: "Routing",      value: bank.routing_number },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: "var(--foreground-muted)", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "var(--foreground-2)" }}>{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Banking card */}
            {bank.mobile_banking?.number && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Smartphone size={15} style={{ color: "var(--accent)" }} />
                  <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Mobile Banking</h2>
                </div>
                <p style={{ fontSize: 11, color: "var(--foreground-muted)", lineHeight: 1.5 }}>
                  Alternatively, pay via mobile banking services:
                </p>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{bank.mobile_banking.provider}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-heading)" }}>{bank.mobile_banking.number}</span>
                </div>
              </div>
            )}

            {/* Support terms */}
            <div className="card" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <ShieldCheck size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>Secure Billing</h4>
                  <p style={{ fontSize: 10, color: "var(--foreground-muted)", lineHeight: 1.4, marginTop: 4 }}>
                    Upon bank confirmation, your invoice status will be updated to Paid. Please email transfer receipts to hello@appibrium.com.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
