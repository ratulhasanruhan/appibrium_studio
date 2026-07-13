import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Project, ActionResult } from "@/types";

let mockProjects: Project[] = [
  { $id: "p1", client_id: "c1", name: "E-Commerce Re-platforming", description: "Modern headless architecture rebuild with Next.js & Appwrite.", status: "active", start_date: "2026-03-01T00:00:00Z", end_date: "2026-08-30T00:00:00Z", budget: 120000, currency: "BDT", $createdAt: "2026-03-01T00:00:00Z" },
  { $id: "p2", client_id: "c1", name: "Mobile App Redesign", description: "Tailwind Native iOS & Android application design & integration.", status: "planning", start_date: "2026-08-01T00:00:00Z", budget: 85000, currency: "BDT", $createdAt: "2026-07-01T00:00:00Z" },
  { $id: "p3", client_id: "c2", name: "Cloud Native Migration", description: "AWS infrastructure modernization and container orchestration.", status: "completed", start_date: "2025-06-15T00:00:00Z", end_date: "2025-12-15T00:00:00Z", budget: 320000, currency: "BDT", $createdAt: "2025-06-15T00:00:00Z" },
];

function isAppwriteReady(): boolean {
  return !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && !!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
}

export async function getProjects(clientId?: string): Promise<Project[]> {
  if (!isAppwriteReady()) {
    if (clientId) {
      return mockProjects.filter((p) => p.client_id === clientId);
    }
    return mockProjects;
  }
  try {
    const queries = clientId ? [Query.equal("client_id", clientId)] : [];
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, queries);
    return res.documents as unknown as Project[];
  } catch (error) {
    console.error("Appwrite getProjects error, falling back to mock:", error);
    if (clientId) {
      return mockProjects.filter((p) => p.client_id === clientId);
    }
    return mockProjects;
  }
}

export async function createProject(data: Omit<Project, "$id" | "$createdAt">): Promise<ActionResult<Project>> {
  if (!isAppwriteReady()) {
    const newProj: Project = {
      ...data,
      $id: "p" + (mockProjects.length + 1),
      $createdAt: new Date().toISOString(),
    };
    mockProjects = [newProj, ...mockProjects];
    return { success: true, data: newProj };
  }
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.PROJECTS, ID.unique(), data);
    return { success: true, data: res as unknown as Project };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create project" };
  }
}
