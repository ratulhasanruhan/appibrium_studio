"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { Receipt, Calendar, DollarSign, ArrowLeft, Loader2, Check, AlertCircle, ExternalLink, Users, FileText, Smartphone } from "lucide-react";
import Link from "next/link";
import { getInvoice, updateInvoice, getInvoiceItems } from "@/services/invoices";
import { getClient } from "@/services/crm";
import { getProject } from "@/services/projects";
import type { Invoice, Client, InvoiceItem, Project } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { useParams } from "next/navigation";
import { sendInvoiceSMS } from "@/services/sms";

const STATUS_BADGE: Record<string, string> = {
  draft:     "badge-draft",
  sent:      "badge-sent",
  paid:      "badge-paid",
  overdue:   "badge-overdue",
  cancelled: "badge-cancelled",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient]   = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems]     = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Change State
  const [status, setStatus]   = useState<Invoice["status"]>("draft");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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
      const inv = await getInvoice(id);
      if (inv) {
        setInvoice(inv);
        setStatus(inv.status);
        
        const [cl, lineItems, proj] = await Promise.all([
          getClient(inv.client_id),
          getInvoiceItems(inv.$id),
          inv.project_id ? getProject(inv.project_id) : Promise.resolve(null),
        ]);
        setClient(cl);
        setItems(lineItems);
        setProject(proj);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleStatusChange(newStatus: Invoice["status"]) {
    setStatus(newStatus);
    setUpdating(true);
    setUpdateSuccess(false);
    const res = await updateInvoice(id, { status: newStatus });
    setUpdating(false);
    if (res.success) {
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2000);
      if (invoice) {
        setInvoice({ ...invoice, status: newStatus });
      }
    } else {
      alert("Failed to update status: " + res.error);
    }
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

  const invoiceRef = `APP-INV-${new Date(invoice.$createdAt).getFullYear()}-${invoice.$id.slice(-4).toUpperCase()}`;

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
                  <span className={`badge ${STATUS_BADGE[invoice.status] || "badge-draft"}`} style={{ textTransform: "capitalize" }}>
                    {invoice.status}
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
              </div>
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
                    disabled={updating}
                    style={{ fontSize: 12 }}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {updating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--foreground-muted)" }}>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Updating status...
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
