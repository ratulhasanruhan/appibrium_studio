import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Person, ActionResult } from "@/types";

export async function getPeople(status?: Person["status"]): Promise<Person[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (status) queries.push(Query.equal("status", status));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PEOPLE, queries);
    return res.documents as unknown as Person[];
  } catch (error) {
    console.error("[People] getPeople error:", error);
    return [];
  }
}

export async function getPersonByToken(token: string): Promise<Person | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PEOPLE, [
      Query.equal("public_token", token),
      Query.limit(1),
    ]);
    return (res.documents[0] as unknown as Person) ?? null;
  } catch (error) {
    console.error("[People] getPersonByToken error:", error);
    return null;
  }
}

export async function getPerson(id: string): Promise<Person | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.PEOPLE, id);
    return res as unknown as Person;
  } catch (error) {
    console.error(`[People] getPerson(${id}) error:`, error);
    return null;
  }
}

export async function createPerson(
  data: Omit<Person, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Person>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.PEOPLE, ID.unique(), data);
    return { success: true, data: res as unknown as Person };
  } catch (error: unknown) {
    console.error("[People] createPerson error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add person" };
  }
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "$id" | "$createdAt" | "$updatedAt">>
): Promise<ActionResult<Person>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.PEOPLE, id, data);
    return { success: true, data: res as unknown as Person };
  } catch (error: unknown) {
    console.error("[People] updatePerson error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update person" };
  }
}

export async function deletePerson(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.PEOPLE, id);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove person" };
  }
}
