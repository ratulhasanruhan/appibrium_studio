import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Project, ActionResult } from "@/types";

// ── Projects ─────────────────────────────────────────────────────────────── //

export async function getProjects(clientId?: string): Promise<Project[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (clientId) queries.push(Query.equal("client_id", clientId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, queries);
    return res.documents as unknown as Project[];
  } catch (error) {
    console.error("[Projects] getProjects error:", error);
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.PROJECTS, id);
    return res as unknown as Project;
  } catch (error) {
    console.error(`[Projects] getProject(${id}) error:`, error);
    return null;
  }
}

export async function createProject(
  data: Omit<Project, "$id" | "$createdAt">
): Promise<ActionResult<Project>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.PROJECTS, ID.unique(), data);
    return { success: true, data: res as unknown as Project };
  } catch (error: any) {
    console.error("[Projects] createProject error:", error);
    return { success: false, error: error.message || "Failed to create project" };
  }
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "$id" | "$createdAt">>
): Promise<ActionResult<Project>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.PROJECTS, id, data);
    return { success: true, data: res as unknown as Project };
  } catch (error: any) {
    console.error("[Projects] updateProject error:", error);
    return { success: false, error: error.message || "Failed to update project" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.PROJECTS, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete project" };
  }
}
