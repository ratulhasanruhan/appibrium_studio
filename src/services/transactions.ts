import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Transaction, ActionResult } from "@/types";

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.TRANSACTIONS, [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
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
  } catch (error: any) {
    console.error("[Transactions] createTransaction error:", error);
    return { success: false, error: error.message || "Failed to log transaction" };
  }
}
