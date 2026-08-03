import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Transaction, ActionResult } from "@/types";

export interface TransactionFilter {
  clientId?: string;
  projectId?: string;
  personId?: string;
  engagementId?: string;
}

export async function getTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (filter.clientId) queries.push(Query.equal("client_id", filter.clientId));
    if (filter.projectId) queries.push(Query.equal("project_id", filter.projectId));
    if (filter.personId) queries.push(Query.equal("person_id", filter.personId));
    if (filter.engagementId) queries.push(Query.equal("engagement_id", filter.engagementId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.TRANSACTIONS, queries);
    return res.documents as unknown as Transaction[];
  } catch (error) {
    console.error("[Transactions] getTransactions error:", error);
    return [];
  }
}

export async function createTransaction(
  data: Omit<Transaction, "$id" | "$createdAt">
): Promise<ActionResult<Transaction>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.TRANSACTIONS, ID.unique(), data);
    return { success: true, data: res as unknown as Transaction };
  } catch (error: unknown) {
    console.error("[Transactions] createTransaction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to log transaction" };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.TRANSACTIONS, id);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete transaction" };
  }
}
