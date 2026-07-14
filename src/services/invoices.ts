import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Invoice, InvoiceItem, ActionResult } from "@/types";

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
