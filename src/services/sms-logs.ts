import { databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";
import type { SmsLog } from "@/types";

/**
 * The SMS delivery trail, newest first.
 *
 * Read-only by design: these are a record of what the gateway was asked to do
 * and what it said back, so nothing in the app edits or removes them.
 */
export async function getSmsLogs(limit = 50): Promise<SmsLog[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.SMS_LOGS, [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]);
    return res.documents as unknown as SmsLog[];
  } catch (error) {
    console.error("[SmsLogs] getSmsLogs error:", error);
    return [];
  }
}
