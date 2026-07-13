import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Client, Contact, Note, ActionResult } from "@/types";

// Fallback mock data in memory if Appwrite isn't fully configured
let mockClients: Client[] = [
  { $id: "c1", name: "TechFlow Inc.", legal_name: "TechFlow Incorporated", email: "contact@techflow.io", phone: "+8801711000001", website: "techflow.io", address: "12/A, Dhanmondi, Dhaka", status: "active", $createdAt: "2025-03-15T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z" },
  { $id: "c2", name: "BuildSmart Ltd.", email: "hello@buildsmart.co", phone: "+8801822000002", website: "buildsmart.co", status: "active", $createdAt: "2025-06-10T00:00:00Z", $updatedAt: "2026-06-15T00:00:00Z" },
  { $id: "c3", name: "DataSync Corp.", email: "ops@datasync.com", website: "datasync.com", status: "active", $createdAt: "2025-08-22T00:00:00Z", $updatedAt: "2026-07-05T00:00:00Z" },
  { $id: "c4", name: "CloudNova", email: "info@cloudnova.io", website: "cloudnova.io", status: "lead", $createdAt: "2026-06-01T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z" },
  { $id: "c5", name: "Nexus Systems", email: "hello@nexus.systems", website: "nexus.systems", status: "inactive", $createdAt: "2024-11-03T00:00:00Z", $updatedAt: "2025-12-01T00:00:00Z" },
  { $id: "c6", name: "Orion Digital", email: "dev@oriondigital.net", website: "oriondigital.net", status: "lead", $createdAt: "2026-07-10T00:00:00Z", $updatedAt: "2026-07-10T00:00:00Z" },
];

let mockContacts: Contact[] = [
  { $id: "con1", client_id: "c1", first_name: "Sarah", last_name: "Connor", email: "sconnor@techflow.io", phone: "+8801711000010", role: "CTO", is_primary: true },
  { $id: "con2", client_id: "c1", first_name: "John", last_name: "Doe", email: "jdoe@techflow.io", role: "Product Manager", is_primary: false },
  { $id: "con3", client_id: "c2", first_name: "Alex", last_name: "Mercer", email: "alex@buildsmart.co", phone: "+8801822000020", role: "CEO", is_primary: true },
];

let mockNotes: Note[] = [
  { $id: "n1", client_id: "c1", title: "Initial onboarding meeting", content: "Discussed requirements for the new e-commerce platform. Client wants a modern stack, high responsiveness, and a strict timeline of 3 months.", created_by: "Ratul Hasan", $createdAt: "2025-03-16T10:00:00Z", $updatedAt: "2025-03-16T10:00:00Z" },
  { $id: "n2", client_id: "c1", title: "Pricing negotiation", content: "Proposed 1,20,000 BDT total. Client accepted the terms and is ready to sign the contract.", created_by: "Ratul Hasan", $createdAt: "2025-03-20T14:30:00Z", $updatedAt: "2025-03-20T14:30:00Z" },
];

function isAppwriteReady(): boolean {
  return !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && !!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
}

export async function getClients(): Promise<Client[]> {
  if (!isAppwriteReady()) {
    return mockClients;
  }
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [Query.orderDesc("$createdAt")]);
    return res.documents as unknown as Client[];
  } catch (error) {
    console.error("Appwrite getClients error, falling back to mock:", error);
    return mockClients;
  }
}

export async function getClient(id: string): Promise<Client | null> {
  if (!isAppwriteReady()) {
    return mockClients.find((c) => c.$id === id) ?? null;
  }
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    return res as unknown as Client;
  } catch (error) {
    console.error(`Appwrite getClient(${id}) error, falling back to mock:`, error);
    return mockClients.find((c) => c.$id === id) ?? null;
  }
}

export async function createClient(data: Omit<Client, "$id" | "$createdAt" | "$updatedAt">): Promise<ActionResult<Client>> {
  if (!isAppwriteReady()) {
    const newClient: Client = {
      ...data,
      $id: "c" + (mockClients.length + 1),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
    };
    mockClients = [newClient, ...mockClients];
    return { success: true, data: newClient };
  }
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), data);
    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create client" };
  }
}

export async function updateClient(id: string, data: Partial<Omit<Client, "$id" | "$createdAt" | "$updatedAt">>): Promise<ActionResult<Client>> {
  if (!isAppwriteReady()) {
    const idx = mockClients.findIndex((c) => c.$id === id);
    if (idx === -1) return { success: false, error: "Client not found" };
    const updated = { ...mockClients[idx], ...data, $updatedAt: new Date().toISOString() };
    mockClients[idx] = updated;
    return { success: true, data: updated };
  }
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTS, id, data);
    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update client" };
  }
}

export async function getContacts(clientId: string): Promise<Contact[]> {
  if (!isAppwriteReady()) {
    return mockContacts.filter((c) => c.client_id === clientId);
  }
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.CONTACTS, [Query.equal("client_id", clientId)]);
    return res.documents as unknown as Contact[];
  } catch (error) {
    console.error("Appwrite getContacts error, falling back to mock:", error);
    return mockContacts.filter((c) => c.client_id === clientId);
  }
}

export async function getNotes(clientId: string): Promise<Note[]> {
  if (!isAppwriteReady()) {
    return mockNotes.filter((n) => n.client_id === clientId);
  }
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTES, [
      Query.equal("client_id", clientId),
      Query.orderDesc("$createdAt"),
    ]);
    return res.documents as unknown as Note[];
  } catch (error) {
    console.error("Appwrite getNotes error, falling back to mock:", error);
    return mockNotes.filter((n) => n.client_id === clientId);
  }
}

export async function createNote(data: Omit<Note, "$id" | "$createdAt" | "$updatedAt">): Promise<ActionResult<Note>> {
  if (!isAppwriteReady()) {
    const newNote: Note = {
      ...data,
      $id: "n" + (mockNotes.length + 1),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
    };
    mockNotes = [newNote, ...mockNotes];
    return { success: true, data: newNote };
  }
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.NOTES, ID.unique(), data);
    return { success: true, data: res as unknown as Note };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create note" };
  }
}
