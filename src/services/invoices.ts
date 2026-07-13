import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Invoice, ActionResult } from "@/types";

let mockInvoices: Invoice[] = [
  { $id: "i1", client_id: "c1", project_id: "p1", proposal_id: "p1", title: "E-Commerce Platform Development — Phase 1", status: "paid", issue_date: "2026-05-01T00:00:00Z", due_date: "2026-05-15T00:00:00Z", subtotal: 120000, tax: 0, discount: 0, total: 120000, currency: "BDT", public_token: "inv_tok_001", paid_at: "2026-05-12T00:00:00Z", $createdAt: "2026-05-01T00:00:00Z" },
  { $id: "i2", client_id: "c2", project_id: "p3", proposal_id: "p2", title: "Cloud Infrastructure Setup — Q2", status: "sent", issue_date: "2026-06-15T00:00:00Z", due_date: "2026-06-30T00:00:00Z", subtotal: 85000, tax: 0, discount: 5000, total: 80000, currency: "BDT", public_token: "inv_tok_002", $createdAt: "2026-06-15T00:00:00Z" },
  { $id: "i3", client_id: "c3", title: "AI Analytics Dashboard — Milestone 2", status: "overdue", issue_date: "2026-06-01T00:00:00Z", due_date: "2026-06-20T00:00:00Z", subtotal: 60000, tax: 0, discount: 0, total: 60000, currency: "BDT", public_token: "inv_tok_003", $createdAt: "2026-06-01T00:00:00Z" },
];

function isAppwriteReady(): boolean {
  return !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && !!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
}

export async function getInvoices(clientId?: string): Promise<Invoice[]> {
  if (!isAppwriteReady()) {
    if (clientId) {
      return mockInvoices.filter((i) => i.client_id === clientId);
    }
    return mockInvoices;
  }
  try {
    const queries = clientId ? [Query.equal("client_id", clientId)] : [];
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, queries);
    return res.documents as unknown as Invoice[];
  } catch (error) {
    console.error("Appwrite getInvoices error, falling back to mock:", error);
    if (clientId) {
      return mockInvoices.filter((i) => i.client_id === clientId);
    }
    return mockInvoices;
  }
}

export async function createInvoice(data: Omit<Invoice, "$id" | "$createdAt">): Promise<ActionResult<Invoice>> {
  if (!isAppwriteReady()) {
    const newInv: Invoice = {
      ...data,
      $id: "i" + (mockInvoices.length + 1),
      $createdAt: new Date().toISOString(),
    };
    mockInvoices = [newInv, ...mockInvoices];
    return { success: true, data: newInv };
  }
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.INVOICES, ID.unique(), data);
    return { success: true, data: res as unknown as Invoice };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create invoice" };
  }
}
