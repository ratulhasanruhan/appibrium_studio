import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Invoice, InvoiceItem, Transaction, ActionResult } from "@/types";
import { createTransaction, deleteTransaction, getTransactions } from "@/services/transactions";
import { applyPayment, balanceDue, refundableAmount } from "@/lib/finance";
import { formatCurrency } from "@/utils";

// ── Invoices ─────────────────────────────────────────────────────────────── //

export async function getInvoices(clientId?: string): Promise<Invoice[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (clientId) queries.push(Query.equal("client_id", clientId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, queries);
    return res.documents as unknown as Invoice[];
  } catch (error) {
    console.error("[Invoices] getInvoices error:", error);
    return [];
  }
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.INVOICES, id);
    return res as unknown as Invoice;
  } catch (error) {
    console.error(`[Invoices] getInvoice(${id}) error:`, error);
    return null;
  }
}

export async function getInvoiceByToken(token: string): Promise<Invoice | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, [
      Query.equal("public_token", token),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return res.documents[0] as unknown as Invoice;
  } catch (error) {
    console.error(`[Invoices] getInvoiceByToken(${token}) error:`, error);
    return null;
  }
}

export async function createInvoice(
  data: Omit<Invoice, "$id" | "$createdAt">
): Promise<ActionResult<Invoice>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.INVOICES, ID.unique(), data);
    return { success: true, data: res as unknown as Invoice };
  } catch (error: any) {
    console.error("[Invoices] createInvoice error:", error);
    return { success: false, error: error.message || "Failed to create invoice" };
  }
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "$id" | "$createdAt">>
): Promise<ActionResult<Invoice>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.INVOICES, id, data);
    return { success: true, data: res as unknown as Invoice };
  } catch (error: any) {
    console.error("[Invoices] updateInvoice error:", error);
    return { success: false, error: error.message || "Failed to update invoice" };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.INVOICES, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete invoice" };
  }
}

// ── Payments ──────────────────────────────────────────────────────────────── //

export interface PaymentInput {
  amount: number;
  /** The day the money landed, as YYYY-MM-DD. */
  date: string;
  /** How it arrived — bank transfer, bKash, cash. Shown on the receipt. */
  method?: string;
  note?: string;
}

/** Both directions of money on one invoice: what came in, and what went back. */
export interface InvoiceLedger {
  payments: Transaction[];
  refunds: Transaction[];
}

function byDate(a: Transaction, b: Transaction): number {
  return (a.transaction_date || a.$createdAt).localeCompare(b.transaction_date || b.$createdAt);
}

/** Every movement booked against an invoice, oldest first. */
export async function getInvoiceLedger(invoiceId: string): Promise<InvoiceLedger> {
  const rows = await getTransactions({ invoiceId });
  return {
    payments: rows.filter((t) => t.type === "income" || t.type === "advance").sort(byDate),
    refunds: rows.filter((t) => t.type === "refund" || t.type === "expense").sort(byDate),
  };
}

/** A payment date is only ever a calendar day; anything else falls back to today. */
function paymentDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

/**
 * Records money received against an invoice.
 *
 * The invoice is re-read first: the running total is derived from whatever is
 * already collected, so applying a payment to a stale copy would overwrite an
 * instalment somebody else recorded in the meantime.
 *
 * The ledger row is written before the invoice, and rolled back if the invoice
 * write fails — an orphaned income row would inflate the company position with
 * money no invoice knows about.
 */
export async function recordInvoicePayment(
  stale: Invoice,
  input: PaymentInput
): Promise<ActionResult<{ invoice: Invoice; payment: Transaction }>> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a payment amount greater than zero." };
  }

  const invoice = (await getInvoice(stale.$id)) ?? stale;
  const outstanding = balanceDue(invoice);
  if (outstanding <= 0) {
    return { success: false, error: "This invoice has nothing left to pay." };
  }
  if (amount - outstanding > 0.01) {
    return {
      success: false,
      error: `That is more than the ${formatCurrency(outstanding, invoice.currency)} still outstanding on this invoice.`,
    };
  }

  const date = paymentDate(input.date);
  const detail = [input.method, input.note].filter(Boolean).join(" · ");
  const booked = await createTransaction({
    type: "income",
    amount,
    currency: invoice.currency || "BDT",
    status: "completed",
    category: "Client Payment",
    description: `Payment received — ${invoice.title}${detail ? ` (${detail})` : ""}`,
    transaction_date: date,
    client_id: invoice.client_id,
    project_id: invoice.project_id,
    invoice_id: invoice.$id,
  });
  if (!booked.success || !booked.data) {
    return { success: false, error: booked.error || "Could not record the payment." };
  }

  const patch = applyPayment(invoice, amount, new Date(`${date}T00:00:00`).toISOString());
  const updated = await updateInvoice(invoice.$id, patch);
  if (!updated.success || !updated.data) {
    await deleteTransaction(booked.data.$id);
    return { success: false, error: updated.error || "Could not update the invoice." };
  }

  return { success: true, data: { invoice: updated.data, payment: booked.data } };
}

/**
 * Voids an invoice, handing back whatever it collected.
 *
 * Cancelling is not a way to make money vanish: anything already received is
 * returned as a refund transaction, so the cash position falls by exactly what
 * it once rose by and both movements stay on the record. The invoice keeps its
 * `amount_paid` — that payment did happen — and the refund stands beside it.
 *
 * Refunds already booked against the invoice are netted off, so cancelling
 * twice cannot pay a client back twice.
 */
export async function cancelInvoice(
  stale: Invoice,
  input: { date: string; note?: string } = { date: "" }
): Promise<ActionResult<{ invoice: Invoice; refund?: Transaction }>> {
  const invoice = (await getInvoice(stale.$id)) ?? stale;
  const { refunds } = await getInvoiceLedger(invoice.$id);
  const owedBack = refundableAmount(invoice, refunds);

  let booked: Transaction | undefined;
  if (owedBack > 0) {
    const res = await createTransaction({
      type: "refund",
      amount: owedBack,
      currency: invoice.currency || "BDT",
      status: "completed",
      category: "Client Refund",
      description: `Refund on cancellation — ${invoice.title}${input.note?.trim() ? ` (${input.note.trim()})` : ""}`,
      transaction_date: paymentDate(input.date),
      client_id: invoice.client_id,
      project_id: invoice.project_id,
      invoice_id: invoice.$id,
    });
    if (!res.success || !res.data) {
      return { success: false, error: res.error || "Could not record the refund." };
    }
    booked = res.data;
  }

  const updated = await updateInvoice(invoice.$id, { status: "cancelled" });
  if (!updated.success || !updated.data) {
    if (booked) await deleteTransaction(booked.$id);
    return { success: false, error: updated.error || "Could not cancel the invoice." };
  }

  return { success: true, data: { invoice: updated.data, refund: booked } };
}

// ── Invoice Items ─────────────────────────────────────────────────────────── //

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICE_ITEMS, [
      Query.equal("invoice_id", invoiceId),
      Query.orderAsc("$createdAt"),
    ]);
    return res.documents as unknown as InvoiceItem[];
  } catch (error) {
    console.error("[Invoices] getInvoiceItems error:", error);
    return [];
  }
}

export async function createInvoiceItem(
  data: Omit<InvoiceItem, "$id">
): Promise<ActionResult<InvoiceItem>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.INVOICE_ITEMS, ID.unique(), data);
    return { success: true, data: res as unknown as InvoiceItem };
  } catch (error: any) {
    console.error("[Invoices] createInvoiceItem error:", error);
    return { success: false, error: error.message || "Failed to create invoice item" };
  }
}
