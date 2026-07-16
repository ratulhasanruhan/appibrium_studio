import { databases, DB_ID, COLLECTIONS, Query, ID } from "@/lib/appwrite/client";
import type { Quote, ActionResult } from "@/types";

export async function getInquiries(clientId?: string): Promise<Quote[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (clientId) {
      queries.push(Query.equal("client_id", clientId));
    }
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.QUOTES, queries);
    return res.documents as unknown as Quote[];
  } catch (error) {
    console.error("[Inquiries] getInquiries error:", error);
    return [];
  }
}

export async function getInquiry(id: string): Promise<Quote | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.QUOTES, id);
    return res as unknown as Quote;
  } catch (error) {
    console.error(`[Inquiries] getInquiry(${id}) error:`, error);
    return null;
  }
}

export async function createInquiry(
  data: Omit<Quote, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Quote>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.QUOTES, ID.unique(), data);
    return { success: true, data: res as unknown as Quote };
  } catch (error: any) {
    console.error("[Inquiries] createInquiry error:", error);
    return { success: false, error: error.message || "Failed to create inquiry" };
  }
}

export async function updateInquiryStatus(
  id: string,
  status: "pending" | "converted" | "declined",
  proposalId?: string
): Promise<ActionResult<Quote>> {
  try {
    const updateData: any = { status };
    if (proposalId) {
      updateData.proposal_id = proposalId;
    }
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.QUOTES, id, updateData);
    return { success: true, data: res as unknown as Quote };
  } catch (error: any) {
    console.error("[Inquiries] updateInquiryStatus error:", error);
    return { success: false, error: error.message || "Failed to update inquiry status" };
  }
}

export async function deleteInquiry(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.QUOTES, id);
    return { success: true };
  } catch (error: any) {
    console.error("[Inquiries] deleteInquiry error:", error);
    return { success: false, error: error.message || "Failed to delete inquiry" };
  }
}
