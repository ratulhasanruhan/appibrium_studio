"use server";

import { createAdminClient, ID, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";
import type { Client, Contact, Note, ActionResult } from "@/types";

// Helper to get server-side databases instance
function getDb() {
  return createAdminClient().databases;
}

// ── Clients ──────────────────────────────────────────────────────────────── //

export async function getClients(): Promise<Client[]> {
  try {
    const res = await getDb().listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
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
    const res = await getDb().getDocument(DB_ID, COLLECTIONS.CLIENTS, id);
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
    const { databases, users } = createAdminClient();
    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Ensure Appwrite Auth user exists (or create it) FIRST
    try {
      const userList = await users.list([
        Query.equal("email", cleanEmail)
      ]);

      if (userList.users.length === 0) {
        // Create user account in Appwrite Auth system
        await users.create(
          ID.unique(),
          cleanEmail,
          data.phone || undefined, // phone
          undefined, // password (keeps password empty, which is used for magic link login)
          data.name
        );
        console.log("[CRM Server] Successfully created Appwrite Auth user for:", cleanEmail);
      } else {
        console.log("[CRM Server] Appwrite Auth user already exists for:", cleanEmail);
      }
    } catch (authErr: any) {
      console.error("[CRM Server] Appwrite Auth creation failed:", authErr);
      return {
        success: false,
        error: `Appwrite Auth Error: ${authErr.message || "Access Denied"}. Please check that APPWRITE_API_KEY is correctly set in your environment variables with 'users.write' and 'users.read' scopes.`
      };
    }

    // 2. Create the client document
    const clientData = {
      ...data,
      email: cleanEmail,
    };
    const res = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), clientData);
    const clientId = res.$id;

    // 3. Create contact document as Primary Contact
    try {
      await databases.createDocument(DB_ID, COLLECTIONS.CONTACTS, ID.unique(), {
        client_id: clientId,
        first_name: data.name,
        last_name: "",
        email: cleanEmail,
        phone: data.phone || undefined,
        role: "Primary Contact",
        is_primary: true,
      });
      console.log("[CRM Server] Successfully created linked Contact record.");
    } catch (contactErr: any) {
      console.error("[CRM Server] Linked contact creation warning:", contactErr.message);
    }

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
    const res = await getDb().updateDocument(DB_ID, COLLECTIONS.CLIENTS, id, data);
    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    console.error("[CRM] updateClient error:", error);
    return { success: false, error: error.message || "Failed to update client" };
  }
}

export async function deleteClient(id: string): Promise<ActionResult<void>> {
  try {
    await getDb().deleteDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    return { success: true };
  } catch (error: any) {
    console.error("[CRM] deleteClient error:", error);
    return { success: false, error: error.message || "Failed to delete client" };
  }
}

// ── Contacts ─────────────────────────────────────────────────────────────── //

export async function getContacts(clientId: string): Promise<Contact[]> {
  try {
    const res = await getDb().listDocuments(DB_ID, COLLECTIONS.CONTACTS, [
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
    const res = await getDb().createDocument(DB_ID, COLLECTIONS.CONTACTS, ID.unique(), data);
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
    const res = await getDb().updateDocument(DB_ID, COLLECTIONS.CONTACTS, id, data);
    return { success: true, data: res as unknown as Contact };
  } catch (error: any) {
    console.error("[CRM] updateContact error:", error);
    return { success: false, error: error.message || "Failed to update contact" };
  }
}

export async function deleteContact(id: string): Promise<ActionResult<void>> {
  try {
    await getDb().deleteDocument(DB_ID, COLLECTIONS.CONTACTS, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete contact" };
  }
}

// ── Notes ────────────────────────────────────────────────────────────────── //

export async function getNotes(clientId: string): Promise<Note[]> {
  try {
    const res = await getDb().listDocuments(DB_ID, COLLECTIONS.NOTES, [
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
    const res = await getDb().createDocument(DB_ID, COLLECTIONS.NOTES, ID.unique(), data);
    return { success: true, data: res as unknown as Note };
  } catch (error: any) {
    console.error("[CRM] createNote error:", error);
    return { success: false, error: error.message || "Failed to create note" };
  }
}

export async function deleteNote(id: string): Promise<ActionResult<void>> {
  try {
    await getDb().deleteDocument(DB_ID, COLLECTIONS.NOTES, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete note" };
  }
}
