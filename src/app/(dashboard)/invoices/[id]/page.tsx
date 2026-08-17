"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { Receipt, ArrowLeft, Loader2, Check, AlertCircle, ExternalLink, Users, FileText, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { getInvoice, updateInvoice, getInvoiceItems, getInvoiceLedger, recordInvoicePayment, cancelInvoice } from "@/services/invoices";
import { getClient } from "@/services/crm";
import { getProject } from "@/services/projects";
import type { Invoice, Client, InvoiceItem, Project, Transaction } from "@/types";
import { formatDate, formatCurrency, documentRef, hasAdminRole } from "@/utils";
import { amountCollected, balanceDue, refundableAmount } from "@/lib/finance";
import { INVOICE_STATUS_BADGE, invoiceStatusLabel } from "@/lib/status";
import { account } from "@/lib/appwrite/client";
import { useParams } from "next/navigation";
import { sendInvoiceSMS, sendPaymentReceivedSMS } from "@/services/sms";
import { sendPaymentReceiptNotification } from "@/services/email";

/** How the money arrived. Free text on the record, but these cover almost every case. */
const PAYMENT_METHODS = ["Bank transfer", "bKash", "Nagad", "Rocket", "Cash", "Cheque", "Card", "Other"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient]   = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems]     = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [refunds, setRefunds]   = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // Status Change State
  const [status, setStatus]   = useState<Invoice["status"]>("draft");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [bookedFlash, setBookedFlash] = useState("");
  const [notifying, setNotifying]   = useState(false);
  const [notifyFlash, setNotifyFlash] = useState("");

  // Payment Entry State
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate]     = useState(today());
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payNote, setPayNote]     = useState("");
  const [recording, setRecording] = useState(false);
  const [payError, setPayError]   = useState("");

  // SMS Notice State
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus]   = useState("");

  async function handleSendSMS() {
    if (!client || !client.phone) {
      alert("This client does not have a phone number configured.");
      return;
    }
    setSmsSending(true);
    setSmsStatus("Sending...");
    try {
      const formattedAmount = formatCurrency(invoice!.total, invoice!.currency);
      const res = await sendInvoiceSMS(
        client.phone,
        id,
        invoice!.public_token,
        client.name,
        formattedAmount
      );
      if (res.success) {
        setSmsStatus("SMS Sent!");
      } else {
        setSmsStatus("Failed to send.");
      }
    } catch (err: any) {
      console.error("SMS notification failed:", err);
      setSmsStatus("Failed to send.");
    } finally {
      setSmsSending(false);
      setTimeout(() => setSmsStatus(""), 3000);
    }
  }

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      // Internal invoice controls are staff only; clients use their share link.
      const user = await account.get().catch(() => null);
      if (!user || !hasAdminRole(user.labels || [])) {
        setDenied(true);
        setLoading(false);
        return;
      }
      const inv = await getInvoice(id);
      if (inv) {
        setInvoice(inv);
        setStatus(inv.status);
        setPayAmount(balanceDue(inv) > 0 ? String(balanceDue(inv)) : "");

        const [cl, lineItems, proj, ledger] = await Promise.all([
          getClient(inv.client_id),
          getInvoiceItems(inv.$id),
          inv.project_id ? getProject(inv.project_id) : Promise.resolve(null),
          getInvoiceLedger(inv.$id),
        ]);
        setClient(cl);
        setItems(lineItems);
        setProject(proj);
        setPayments(ledger.payments);
        setRefunds(ledger.refunds);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleStatusChange(newStatus: Invoice["status"]) {
    if (!invoice) return;

    // "Paid" is a statement about money, not a label: settling from here books
    // whatever is still outstanding as a payment, so an invoice that already
    // took a deposit records only the remainder rather than its total again.
    if (newStatus === "paid" && balanceDue(invoice) > 0) {
      await handleRecordPayment(balanceDue(invoice), "Settling the balance...");
      return;
    }

    // Money that was handed back cannot be un-handed back. Reviving a refunded
    // invoice would show the client owing a balance we have already returned, so
    // the correct move is a fresh invoice.
    const handedBack = refunds.reduce((s, r) => s + (r.amount || 0), 0);
    if (invoice.status === "cancelled" && newStatus !== "cancelled" && handedBack > 0) {
      alert(
        `${formatCurrency(handedBack, invoice.currency)} has already been refunded on this invoice, ` +
        `so it cannot be reopened. Raise a new invoice for any further work.`
      );
      return;
    }

    // Cancelling an invoice that took money books the refund in the same step.
    if (newStatus === "cancelled" && refundableAmount(invoice, refunds) > 0) {
      await handleCancelWithRefund();
      return;
    }

    const now = new Date().toISOString();
    setStatus(newStatus);
    setUpdating(true);
    setUpdateSuccess(false);

    // Stamp the moment a status is reached, so the client-facing invoice can
    // show "Paid on ..." and reports can measure how long payment took.
    const patch: Partial<Invoice> = { status: newStatus };
    if (newStatus === "paid" && !invoice.paid_at) patch.paid_at = now;
    if (newStatus === "sent" && !invoice.sent_at) patch.sent_at = now;

    const res = await updateInvoice(id, patch);
    setUpdating(false);
    if (!res.success) {
      setStatus(invoice.status);
      alert("Failed to update status: " + res.error);
      return;
    }
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 2000);
    setInvoice({ ...invoice, ...patch });
  }

  /**
   * Books money received against this invoice.
   *
   * The amount decides the status: anything short of the balance leaves the
   * invoice partially paid, and only a full settlement stamps paid_at. The
   * ledger entry is written by the service, so the transactions screen and the
   * project net position pick the payment up without a second write here.
   */
  async function handleRecordPayment(amount: number, pendingLabel = "Recording payment...") {
    if (!invoice) return;
    setPayError("");
    setRecording(true);
    setBookedFlash(pendingLabel);

    const res = await recordInvoicePayment(invoice, {
      amount,
      date: payDate || today(),
      method: payMethod,
      note: payNote.trim() || undefined,
    });
    setRecording(false);

    if (!res.success || !res.data) {
      setBookedFlash("");
      setPayError(res.error || "Could not record the payment.");
      return;
    }

    const updated = res.data.invoice;
    setInvoice(updated);
    setStatus(updated.status);
    // Read the trail back rather than appending, so a payment somebody else
    // recorded while this page was open shows up too.
    const ledger = await getInvoiceLedger(updated.$id);
    setPayments(ledger.payments);
    setRefunds(ledger.refunds);
    setPayNote("");
    const remaining = balanceDue(updated);
    setPayAmount(remaining > 0 ? String(remaining) : "");

    setBookedFlash(
      remaining > 0
        ? `${formatCurrency(amount, updated.currency)} recorded · ${formatCurrency(remaining, updated.currency)} still outstanding.`
        : `${formatCurrency(amount, updated.currency)} recorded · invoice settled.`
    );
    setTimeout(() => setBookedFlash(""), 6000);

    notifyClientOfPayment(updated, amount);
  }

  /**
   * Cancels an invoice that has taken money, returning it in the same step.
   *
   * Confirmed first because it moves cash: the refund lands in Transactions as
   * an outflow, which is what stops a cancellation from quietly leaving the
   * business looking better off than it is.
   */
  async function handleCancelWithRefund() {
    if (!invoice) return;
    const owedBack = refundableAmount(invoice, refunds);
    const ok = confirm(
      `${formatCurrency(owedBack, invoice.currency)} has been received against this invoice.\n\n` +
      `Cancelling records a refund of ${formatCurrency(owedBack, invoice.currency)} to ${client?.name || "the client"} ` +
      `in Transactions, dated ${formatDate(payDate || today())}.\n\nContinue?`
    );
    if (!ok) return;

    setPayError("");
    setRecording(true);
    setBookedFlash("Cancelling and booking the refund...");

    const res = await cancelInvoice(invoice, { date: payDate || today(), note: payNote.trim() || undefined });
    setRecording(false);

    if (!res.success || !res.data) {
      setBookedFlash("");
      setPayError(res.error || "Could not cancel the invoice.");
      return;
    }

    setInvoice(res.data.invoice);
    setStatus(res.data.invoice.status);
    const ledger = await getInvoiceLedger(res.data.invoice.$id);
    setPayments(ledger.payments);
    setRefunds(ledger.refunds);
    setPayNote("");
    setBookedFlash(
      `Invoice cancelled · ${formatCurrency(owedBack, invoice.currency)} refund recorded in Transactions.`
    );
    setTimeout(() => setBookedFlash(""), 8000);
  }

  /**
   * Tell the client their money landed: a receipt by email, and a short SMS if
   * we hold a number. Runs after the payment is already saved and reports
   * through its own flash, so a provider outage cannot undo a recorded payment.
   * A part payment carries the remaining balance so the client knows the
   * invoice is not closed.
   */
  async function notifyClientOfPayment(paid: Invoice, amountReceived: number) {
    if (!client?.email) return;
    setNotifying(true);
    setNotifyFlash("");

    const amount = formatCurrency(amountReceived, paid.currency);
    const remaining = balanceDue(paid);
    const balance = remaining > 0 ? formatCurrency(remaining, paid.currency) : undefined;
    const reference = documentRef("INV", paid.$createdAt, paid.$id);
    const paidOn = formatDate(payDate || new Date().toISOString());
    const sent: string[] = [];

    try {
      const mail = await sendPaymentReceiptNotification({
        clientEmail: client.email,
        clientName: client.name,
        invoiceTitle: paid.title,
        amount,
        paidOn,
        token: paid.public_token,
        reference,
        balance,
        dueDate: balance ? formatDate(paid.due_date) : undefined,
      });
      if (mail.success) sent.push("Receipt emailed");
      else console.error("Payment receipt email failed:", mail.error);

      if (client.phone) {
        const sms = await sendPaymentReceivedSMS(client.phone, client.name, amount, reference, balance);
        if (sms.success) sent.push("SMS sent");
        else console.error("Payment receipt SMS failed:", sms);
      }
    } catch (err) {
      console.error("Payment notification failed:", err);
    } finally {
      setNotifying(false);
      setNotifyFlash(sent.length ? `${sent.join(" · ")} to ${client.name}.` : "Could not notify the client.");
      setTimeout(() => setNotifyFlash(""), 6000);
    }
  }

  function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a payment amount greater than zero.");
      return;
    }
    handleRecordPayment(amount);
  }

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        <span style={{ fontSize: 13, color: "var(--foreground-muted)" }}>Loading invoice details...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="card" style={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={32} style={{ color: "#B45309" }} />
        <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>This invoice workspace is available to staff only.</p>
        <Link href="/invoices" className="btn btn-ghost" style={{ fontSize: 12 }}>
          <ArrowLeft size={13} /> Back to Invoices
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="card" style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={32} style={{ color: "#D14F4F" }} />
        <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>Invoice not found.</p>
        <Link href="/invoices" className="btn btn-ghost" style={{ fontSize: 12 }}>
          <ArrowLeft size={13} /> Back to Invoices
        </Link>
      </div>
    );
  }

  const invoiceRef = documentRef("APP-INV", invoice.$createdAt, invoice.$id);
  const collected  = amountCollected(invoice);
  const balance    = balanceDue(invoice);
  const settled    = balance <= 0;
  const collectedPct = invoice.total > 0 ? Math.min(Math.round((collected / invoice.total) * 100), 100) : 0;
  const refundedTotal = refunds.reduce((s, r) => s + (r.amount || 0), 0);
  const lastRefund = refunds[refunds.length - 1];

  return (
    <>
      <Topbar title="Invoice Workspace" subtitle={`Manage status, items, and billing details for ${invoiceRef}`} />
      <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Back Link */}
        <div>
          <Link href="/invoices" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--foreground-muted)", textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Invoices list
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          {/* Left Block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* General Info */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>{invoice.title}</h2>
                    <span style={{ fontSize: 11, color: "var(--foreground-muted)", fontFamily: "var(--font-mono, monospace)" }}>{invoiceRef}</span>
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={`badge ${INVOICE_STATUS_BADGE[invoice.status] || "badge-draft"}`} style={{ textTransform: "capitalize" }}>
                    {invoiceStatusLabel(invoice.status)}
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

              {/* Line Items Table */}
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)", marginBottom: 10 }}>Line Items</h3>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--foreground-muted)", fontWeight: 600 }}>Description</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontWeight: 600, width: 60 }}>Qty</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontWeight: 600, width: 100 }}>Unit Price</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontWeight: 600, width: 100 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 12px", color: "var(--foreground-2)" }}>{item.description}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground)" }}>{item.quantity}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground)" }}>{formatCurrency(item.unit_price, invoice.currency)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--foreground)", fontWeight: 600 }}>{formatCurrency(item.amount, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total calculations */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-end", maxWidth: 280, marginLeft: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--foreground-muted)" }}>Subtotal</span>
                  <span style={{ color: "var(--foreground)" }}>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D14F4F" }}>
                    <span>Discount</span>
                    <span>-{formatCurrency(invoice.discount, invoice.currency)}</span>
                  </div>
                )}
                {invoice.tax > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--foreground-muted)" }}>Tax</span>
                    <span style={{ color: "var(--foreground)" }}>+{formatCurrency(invoice.tax, invoice.currency)}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                  <span style={{ color: "var(--foreground)" }}>Total Amount</span>
                  <span style={{ color: "var(--accent)" }}>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {collected > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#00965C" }}>
                      <span>Paid to date</span>
                      <span>−{formatCurrency(collected, invoice.currency)}</span>
                    </div>
                    {refundedTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D14F4F" }}>
                        <span>Refunded to client</span>
                        <span>{formatCurrency(refundedTotal, invoice.currency)}</span>
                      </div>
                    )}
                    {invoice.status !== "cancelled" && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>Balance Due</span>
                        <span style={{ color: settled ? "#00965C" : "#B45309" }}>{formatCurrency(balance, invoice.currency)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Payments — the instalment record and where new money is booked */}
            <div className="card">
              <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Wallet size={14} style={{ color: "var(--accent)" }} /> Payments
              </h3>

              {/* Collected / outstanding at a glance */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${refundedTotal > 0 ? 4 : 3}, 1fr)`, gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Invoiced", value: invoice.total, color: "var(--foreground)" },
                  { label: "Received", value: collected,     color: "#00965C" },
                  ...(refundedTotal > 0
                    ? [{ label: "Refunded", value: refundedTotal, color: "#D14F4F" }]
                    : []),
                  { label: "Balance",  value: balance,       color: settled ? "var(--foreground-muted)" : "#B45309" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--foreground-muted)", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color }}>{formatCurrency(value, invoice.currency)}</p>
                  </div>
                ))}
              </div>

              <div style={{ height: 6, background: "var(--surface)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${collectedPct}%`, height: "100%", background: refundedTotal > 0 ? "#D14F4F" : settled ? "#00965C" : "#B45309", transition: "width 0.3s" }} />
              </div>

              {(payments.length > 0 || refunds.length > 0) && (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--foreground-muted)", fontWeight: 600, width: 110 }}>Date</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--foreground-muted)", fontWeight: 600 }}>Recorded as</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--foreground-muted)", fontWeight: 600, width: 110 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Money in, then money handed back — the invoice's whole cash history. */}
                      {[...payments.map((t) => ({ t, out: false })), ...refunds.map((t) => ({ t, out: true }))].map(({ t, out }) => (
                        <tr key={t.$id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-2)" }}>{formatDate(t.transaction_date || t.$createdAt)}</td>
                          <td style={{ padding: "10px 12px", color: "var(--foreground-muted)" }}>{t.description}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: out ? "#D14F4F" : "#00965C" }}>
                            {out ? "−" : ""}{formatCurrency(t.amount, t.currency || invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bookedFlash && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: recording ? "var(--foreground-muted)" : "#00965C", marginBottom: 12 }}>
                  {recording
                    ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    : <Check size={12} />}
                  {bookedFlash}
                </div>
              )}

              {/* Cancelled is checked before settled: a void invoice has no balance
                  left either, and must never read as though it was paid off. */}
              {invoice.status === "cancelled" ? (
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", lineHeight: 1.6 }}>
                  {refundedTotal > 0
                    ? <>Cancelled · {formatCurrency(refundedTotal, invoice.currency)} refunded{lastRefund ? ` on ${formatDate(lastRefund.transaction_date || lastRefund.$createdAt)}` : ""}, recorded as an outflow in Transactions. This invoice cannot be reopened — raise a new one for any further work.</>
                    : <>This invoice is cancelled — no further payments can be recorded.</>}
                </p>
              ) : invoice.status === "draft" ? (
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
                  Send this invoice before recording payments against it.
                </p>
              ) : settled ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#00965C", fontWeight: 500 }}>
                  <Check size={13} /> Settled in full{invoice.paid_at ? ` on ${formatDate(invoice.paid_at)}` : ""}.
                </div>
              ) : (
                <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)" }}>Record a payment</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label htmlFor="pay-amount" style={{ display: "block", fontSize: 11, color: "var(--foreground-muted)", marginBottom: 4 }}>Amount</label>
                      <input
                        id="pay-amount" className="input-base" type="number" min="0" step="0.01"
                        value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                        style={{ fontSize: 12 }} disabled={recording}
                      />
                    </div>
                    <div>
                      <label htmlFor="pay-date" style={{ display: "block", fontSize: 11, color: "var(--foreground-muted)", marginBottom: 4 }}>Received on</label>
                      <input
                        id="pay-date" className="input-base" type="date"
                        value={payDate} onChange={(e) => setPayDate(e.target.value)}
                        style={{ fontSize: 12 }} disabled={recording}
                      />
                    </div>
                    <div>
                      <label htmlFor="pay-method" style={{ display: "block", fontSize: 11, color: "var(--foreground-muted)", marginBottom: 4 }}>Method</label>
                      <select
                        id="pay-method" className="input-base" value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        style={{ fontSize: 12 }} disabled={recording}
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pay-note" style={{ display: "block", fontSize: 11, color: "var(--foreground-muted)", marginBottom: 4 }}>Reference or note (optional)</label>
                    <input
                      id="pay-note" className="input-base" value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Transaction ID, cheque number, or a short note"
                      style={{ fontSize: 12 }} disabled={recording}
                    />
                  </div>

                  {payError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#D14F4F" }}>
                      <AlertCircle size={12} /> {payError}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="submit" className="btn btn-primary" disabled={recording} style={{ fontSize: 12 }}>
                      {recording
                        ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} /> Recording...</>
                        : "Record payment"}
                    </button>
                    <button
                      type="button" className="btn btn-ghost" disabled={recording}
                      onClick={() => setPayAmount(String(balance))}
                      style={{ fontSize: 11 }}
                    >
                      Full balance ({formatCurrency(balance, invoice.currency)})
                    </button>
                  </div>
                  <p style={{ fontSize: 10.5, color: "var(--foreground-muted)", lineHeight: 1.5 }}>
                    Each payment is booked to Transactions and emailed to the client as a receipt.
                    The invoice settles itself once the balance reaches zero.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Right Block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status Control */}
            <div className="card">
              <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Invoice Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <select
                    className="input-base"
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    disabled={updating || recording}
                    style={{ fontSize: 12 }}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    {/* Set by recording payments, never chosen by hand — a partial
                        status without an amount behind it means nothing. */}
                    <option value="partially_paid" disabled>Partially paid</option>
                    <option value="paid">{balance > 0 ? `Paid (settles ${formatCurrency(balance, invoice.currency)})` : "Paid"}</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {updating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--foreground-muted)" }}>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Updating status...
                  </div>
                )}

                {notifying && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--foreground-muted)" }}>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending the client their receipt...
                  </div>
                )}

                {notifyFlash && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: notifyFlash.startsWith("Could not") ? "#B45309" : "#00965C", lineHeight: 1.5 }}>
                    <Check size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {notifyFlash}
                  </div>
                )}

                {updateSuccess && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#00965C" }}>
                    <Check size={12} /> Status saved!
                  </div>
                )}
              </div>
            </div>

            {/* Client Info */}
            <div className="card">
              <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={14} style={{ color: "var(--accent)" }} /> Client
              </h3>
              {client ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{client.name}</p>
                    <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{client.email}</p>
                  </div>
                  <Link href={`/crm/${client.$id}`} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 4 }}>
                    CRM Workspace
                  </Link>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>No client record linked.</p>
              )}
            </div>

            {/* Linked Project */}
            {project && (
              <div className="card">
                <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={14} style={{ color: "var(--accent)" }} /> Project Link
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{project.name}</p>
                    <span className="badge badge-active" style={{ textTransform: "capitalize", display: "inline-block", marginTop: 4 }}>{project.status}</span>
                  </div>
                  <Link href={`/projects/${project.$id}`} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 11, marginTop: 4 }}>
                    Project Workspace
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Outbound Notice</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href={`/public/invoice/${invoice.public_token}`}
                  target="_blank"
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", fontSize: 11 }}
                >
                  <ExternalLink size={12} /> Launch Client Portal
                </a>

                {client?.phone ? (
                  <button
                    onClick={handleSendSMS}
                    className="btn btn-ghost"
                    disabled={smsSending}
                    style={{ width: "100%", justifyContent: "center", fontSize: 11 }}
                  >
                    {smsSending ? (
                      <>
                        <Loader2 size={12} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />
                        Sending SMS...
                      </>
                    ) : smsStatus ? (
                      <>
                        <Check size={12} style={{ color: "#00965C", marginRight: 6 }} />
                        {smsStatus}
                      </>
                    ) : (
                      <>
                        <Smartphone size={12} style={{ marginRight: 6 }} />
                        Send SMS Notice
                      </>
                    )}
                  </button>
                ) : (
                  <div style={{ fontSize: 10, color: "var(--foreground-muted)", textAlign: "center", padding: "4px 0" }}>
                    No client phone for SMS notices.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
