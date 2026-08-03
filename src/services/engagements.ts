import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Engagement, ActionResult } from "@/types";

export interface EngagementFilter {
  personId?: string;
  projectId?: string;
}

export async function getEngagements(filter: EngagementFilter = {}): Promise<Engagement[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (filter.personId) queries.push(Query.equal("person_id", filter.personId));
    if (filter.projectId) queries.push(Query.equal("project_id", filter.projectId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.ENGAGEMENTS, queries);
    return res.documents as unknown as Engagement[];
  } catch (error) {
    console.error("[Engagements] getEngagements error:", error);
    return [];
  }
}

export async function createEngagement(
  data: Omit<Engagement, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Engagement>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.ENGAGEMENTS, ID.unique(), data);
    return { success: true, data: res as unknown as Engagement };
  } catch (error: unknown) {
    console.error("[Engagements] createEngagement error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create engagement" };
  }
}

export async function updateEngagement(
  id: string,
  data: Partial<Omit<Engagement, "$id" | "$createdAt" | "$updatedAt">>
): Promise<ActionResult<Engagement>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.ENGAGEMENTS, id, data);
    return { success: true, data: res as unknown as Engagement };
  } catch (error: unknown) {
    console.error("[Engagements] updateEngagement error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update engagement" };
  }
}

export async function deleteEngagement(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.ENGAGEMENTS, id);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete engagement" };
  }
}
