import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Client, Contact, Note, ActionResult } from "@/types";

// ── Clients ──────────────────────────────────────────────────────────────── //

export async function getClients(): Promise<Client[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    return res.documents as unknown as Client[];
  } catch (error) {
    console.error("[CRM] getClients error:", error);
    return [];
  }
}

export async function getClient(id: string): Promise<Client | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    return res as unknown as Client;
  } catch (error) {
    console.error(`[CRM] getClient(${id}) error:`, error);
    return null;
  }
}

export async function createClient(
  data: Omit<Client, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Client>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), data);
    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    console.error("[CRM] createClient error:", error);
    return { success: false, error: error.message || "Failed to create client" };
  }
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "$id" | "$createdAt" | "$updatedAt">>
): Promise<ActionResult<Client>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTS, id, data);
    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    console.error("[CRM] updateClient error:", error);
    return { success: false, error: error.message || "Failed to update client" };
  }
}

export async function deleteClient(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    return { success: true };
  } catch (error: any) {
    console.error("[CRM] deleteClient error:", error);
    return { success: false, error: error.message || "Failed to delete client" };
  }
}

// ── Contacts ─────────────────────────────────────────────────────────────── //

export async function getContacts(clientId: string): Promise<Contact[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.CONTACTS, [
      Query.equal("client_id", clientId),
      Query.orderDesc("$createdAt"),
    ]);
    return res.documents as unknown as Contact[];
  } catch (error) {
    console.error("[CRM] getContacts error:", error);
    return [];
  }
}

export async function createContact(
  data: Omit<Contact, "$id">
): Promise<ActionResult<Contact>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.CONTACTS, ID.unique(), data);
    return { success: true, data: res as unknown as Contact };
  } catch (error: any) {
    console.error("[CRM] createContact error:", error);
    return { success: false, error: error.message || "Failed to create contact" };
  }
}

export async function updateContact(
  id: string,
  data: Partial<Omit<Contact, "$id">>
): Promise<ActionResult<Contact>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.CONTACTS, id, data);
    return { success: true, data: res as unknown as Contact };
  } catch (error: any) {
    console.error("[CRM] updateContact error:", error);
    return { success: false, error: error.message || "Failed to update contact" };
  }
}

export async function deleteContact(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.CONTACTS, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete contact" };
  }
}

// ── Notes ────────────────────────────────────────────────────────────────── //

export async function getNotes(clientId: string): Promise<Note[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTES, [
      Query.equal("client_id", clientId),
      Query.orderDesc("$createdAt"),
    ]);
    return res.documents as unknown as Note[];
  } catch (error) {
    console.error("[CRM] getNotes error:", error);
    return [];
  }
}

export async function createNote(
  data: Omit<Note, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Note>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.NOTES, ID.unique(), data);
    return { success: true, data: res as unknown as Note };
  } catch (error: any) {
    console.error("[CRM] createNote error:", error);
    return { success: false, error: error.message || "Failed to create note" };
  }
}

export async function deleteNote(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.NOTES, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete note" };
  }
}
