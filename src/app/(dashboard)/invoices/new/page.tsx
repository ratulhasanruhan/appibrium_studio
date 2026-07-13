"use client";

import { useState } from "react";
import { Plus, Trash2, Send, MessageSquare, Download, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { InvoiceItem, BankDetails } from "@/types";
import Link from "next/link";

const DEFAULT_BANK: BankDetails = {
  account_name:   "Appibrium Technology Co.",
  account_number: "",
  bank_name:      "",
  branch:         "",
  routing_number: "",
  mobile_banking: { provider: "bKash", number: "" },
};

interface LineItem extends Omit<InvoiceItem, "$id" | "invoice_id"> {
  id: string;
}

export default function NewInvoicePage() {
  const [client, setClient]         = useState("");
  const [title, setTitle]           = useState("");
  const [issueDate, setIssueDate]   = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]       = useState("");
  const [notes, setNotes]           = useState("");
  const [currency]                  = useState("BDT");
  const [items, setItems]           = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [bank, setBank]             = useState<BankDetails>(DEFAULT_BANK);
  const [showBankEdit, setShowBankEdit] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, { id: Date.now().toString(), description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.amount = updated.quantity * updated.unit_price;
        return updated;
      })
    );
  }

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const total    = subtotal;

  return (
    <div className="page-content" style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/invoices" style={{ color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">New Invoice</h1>
          <p className="page-subtitle">Draft a new invoice with line items and bank details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}><Download size={13} /> Save Draft</button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }}><MessageSquare size={13} /> Send SMS</button>
          <button className="btn btn-primary" style={{ fontSize: 12 }}><Send size={13} /> Send Invoice</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>

        {/* ─── Main Form ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Client + Meta */}
          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 16 }}>Invoice Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client *</label>
                <select id="invoice-client" className="input-base" value={client} onChange={(e) => setClient(e.target.value)}>
                  <option value="">Select client...</option>
                  <option value="c1">TechFlow Inc.</option>
                  <option value="c2">BuildSmart Ltd.</option>
                  <option value="c3">DataSync Corp.</option>
                  <option value="c4">CloudNova</option>
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Invoice Title *</label>
                <input id="invoice-title" className="input-base" placeholder="e.g. Web Development — Phase 1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Issue Date</label>
                <input id="invoice-issue-date" className="input-base" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Due Date</label>
                <input id="invoice-due-date" className="input-base" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Line Items</h2>
              <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>
                <Plus size={12} /> Add Item
              </button>
            </div>

            {/* Items Table */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 70 }}>Qty</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 120 }}>Unit Price</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--foreground-muted)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", width: 120 }}>Amount</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "8px 6px 8px 12px" }}>
                        <input
                          className="input-base"
                          placeholder="Service or product description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          style={{ boxShadow: "none", border: "none", padding: "4px 0", borderRadius: 0, background: "transparent", fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <input
                          type="number"
                          min={1}
                          className="input-base"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          style={{ textAlign: "right", boxShadow: "none", border: "none", padding: "4px 0", borderRadius: 0, background: "transparent", fontSize: 12, width: 60 }}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <span style={{ color: "var(--foreground-muted)", fontSize: 12 }}>৳</span>
                          <input
                            type="number"
                            min={0}
                            className="input-base"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                            style={{ textAlign: "right", boxShadow: "none", border: "none", padding: "4px 0", borderRadius: 0, background: "transparent", fontSize: 12, width: 90 }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px 8px 6px", textAlign: "right", fontWeight: 600, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>
                        {formatCurrency(item.amount, currency)}
                      </td>
                      <td style={{ padding: "8px 8px 8px 0" }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: items.length > 1 ? "pointer" : "not-allowed", color: items.length > 1 ? "#D14F4F" : "var(--foreground-faint)", padding: 4, borderRadius: "var(--radius-sm)", opacity: items.length === 1 ? 0.3 : 1 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <div style={{ minWidth: 240, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--foreground-muted)" }}>
                  <span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div style={{ height: 1, background: "var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>
                  <span>Total</span><span style={{ color: "var(--accent)" }}>{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Notes</h2>
            <textarea
              id="invoice-notes"
              className="input-base"
              placeholder="Payment terms, instructions, or additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ─── Right Sidebar: Bank Details ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Bank Details Card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)" }}>Bank Details</h2>
              <button onClick={() => setShowBankEdit(!showBankEdit)} style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                {showBankEdit ? "Done" : "Edit"}
              </button>
            </div>

            {showBankEdit ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Account Name",   field: "account_name",   placeholder: "Company name" },
                  { label: "Account Number", field: "account_number", placeholder: "0000 0000 0000 0000" },
                  { label: "Bank Name",      field: "bank_name",      placeholder: "e.g. Dutch Bangla Bank" },
                  { label: "Branch",         field: "branch",         placeholder: "Branch name" },
                  { label: "Routing No.",    field: "routing_number", placeholder: "Routing number" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                    <input
                      className="input-base"
                      placeholder={placeholder}
                      value={(bank as any)[field] ?? ""}
                      onChange={(e) => setBank((prev) => ({ ...prev, [field]: e.target.value }))}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile Banking</label>
                  <select
                    className="input-base"
                    value={bank.mobile_banking?.provider ?? "bKash"}
                    onChange={(e) => setBank((prev) => ({ ...prev, mobile_banking: { ...prev.mobile_banking!, provider: e.target.value, number: prev.mobile_banking?.number ?? "" } }))}
                    style={{ marginBottom: 8, fontSize: 12 }}
                  >
                    {["bKash", "Nagad", "Rocket", "Upay"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input
                    className="input-base"
                    placeholder="Mobile number"
                    value={bank.mobile_banking?.number ?? ""}
                    onChange={(e) => setBank((prev) => ({ ...prev, mobile_banking: { provider: prev.mobile_banking?.provider ?? "bKash", number: e.target.value } }))}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Account Name",   value: bank.account_name || "—" },
                  { label: "Account No.",    value: bank.account_number || "—" },
                  { label: "Bank",           value: bank.bank_name || "—" },
                  { label: "Branch",         value: bank.branch || "—" },
                  { label: "Routing",        value: bank.routing_number || "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--foreground-2)", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
                  </div>
                ))}
                {bank.mobile_banking?.number && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{bank.mobile_banking.provider}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)" }}>{bank.mobile_banking.number}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SMS Actions */}
          <div className="card" style={{ borderColor: "rgba(0,184,114,0.2)", background: "linear-gradient(135deg, #E6FAF3, var(--background-alt))" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Send to Client</h2>
            <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginBottom: 14 }}>
              Share the invoice link via SMS to the client's phone number.
            </p>
            <button id="send-invoice-sms" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              <MessageSquare size={13} />
              Send SMS Link
            </button>
          </div>

          {/* Summary */}
          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Summary</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Items</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Currency</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>BDT (৳)</span>
              </div>
              <div style={{ height: 1, background: "var(--border)" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>Total</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--accent)" }}>{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
