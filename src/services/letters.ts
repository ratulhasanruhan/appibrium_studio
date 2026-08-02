import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Letter, ActionResult } from "@/types";

// ── Letters ──────────────────────────────────────────────────────────────── //

export async function getLetters(clientId?: string): Promise<Letter[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (clientId) queries.push(Query.equal("client_id", clientId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.LETTERS, queries);
    return res.documents as unknown as Letter[];
  } catch (error) {
    console.error("[Letters] getLetters error:", error);
    return [];
  }
}

export async function getLetter(id: string): Promise<Letter | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.LETTERS, id);
    return res as unknown as Letter;
  } catch (error) {
    console.error(`[Letters] getLetter(${id}) error:`, error);
    return null;
  }
}

export async function getLetterByToken(token: string): Promise<Letter | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.LETTERS, [
      Query.equal("public_token", token),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return res.documents[0] as unknown as Letter;
  } catch (error) {
    console.error(`[Letters] getLetterByToken(${token}) error:`, error);
    return null;
  }
}

export async function createLetter(
  data: Omit<Letter, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Letter>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.LETTERS, ID.unique(), data);
    return { success: true, data: res as unknown as Letter };
  } catch (error: unknown) {
    console.error("[Letters] createLetter error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create letter" };
  }
}

export async function updateLetter(
  id: string,
  data: Partial<Omit<Letter, "$id" | "$createdAt" | "$updatedAt">>
): Promise<ActionResult<Letter>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.LETTERS, id, data);
    return { success: true, data: res as unknown as Letter };
  } catch (error: unknown) {
    console.error("[Letters] updateLetter error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update letter" };
  }
}

export async function deleteLetter(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.LETTERS, id);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete letter" };
  }
}

/** Sequential-ish reference, e.g. APP-AGR-2026-0007 */
export async function nextReference(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.LETTERS, [
      Query.startsWith("reference", `${prefix}-${year}`),
      Query.limit(100),
    ]);
    return `${prefix}-${year}-${String(res.total + 1).padStart(4, "0")}`;
  } catch {
    return `${prefix}-${year}-${String(Date.now()).slice(-4)}`;
  }
}
