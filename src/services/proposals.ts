import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Proposal, ActionResult } from "@/types";

let mockProposals: Proposal[] = [
  { $id: "p1", client_id: "c1", title: "E-Commerce Platform Development", status: "accepted", content_html: "<p>E-Commerce proposal details</p>", public_token: "tok_abc123", version: 2, currency: "BDT", sent_at: "2026-06-10T00:00:00Z", viewed_at: "2026-06-11T00:00:00Z", accepted_at: "2026-06-12T00:00:00Z", $createdAt: "2026-06-08T00:00:00Z", $updatedAt: "2026-06-12T00:00:00Z" },
  { $id: "p2", client_id: "c2", title: "Cloud Infrastructure Migration", status: "sent", content_html: "<p>Cloud migration details</p>", public_token: "tok_def456", version: 1, currency: "BDT", sent_at: "2026-07-01T00:00:00Z", $createdAt: "2026-06-28T00:00:00Z", $updatedAt: "2026-07-01T00:00:00Z" },
  { $id: "p3", client_id: "c3", title: "AI Data Pipeline & Analytics Dashboard", status: "viewed", public_token: "tok_ghi789", version: 3, currency: "BDT", sent_at: "2026-07-05T00:00:00Z", viewed_at: "2026-07-06T00:00:00Z", $createdAt: "2026-07-03T00:00:00Z", $updatedAt: "2026-07-06T00:00:00Z" },
  { $id: "p4", client_id: "c4", title: "IoT Fleet Management System", status: "draft", public_token: "tok_jkl012", version: 1, currency: "BDT", $createdAt: "2026-07-10T00:00:00Z", $updatedAt: "2026-07-10T00:00:00Z" },
];

function isAppwriteReady(): boolean {
  return !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID && !!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
}

export async function getProposals(clientId?: string): Promise<Proposal[]> {
  if (!isAppwriteReady()) {
    if (clientId) {
      return mockProposals.filter((p) => p.client_id === clientId);
    }
    return mockProposals;
  }
  try {
    const queries = clientId ? [Query.equal("client_id", clientId)] : [];
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROPOSALS, queries);
    return res.documents as unknown as Proposal[];
  } catch (error) {
    console.error("Appwrite getProposals error, falling back to mock:", error);
    if (clientId) {
      return mockProposals.filter((p) => p.client_id === clientId);
    }
    return mockProposals;
  }
}

export async function createProposal(data: Omit<Proposal, "$id" | "$createdAt" | "$updatedAt">): Promise<ActionResult<Proposal>> {
  if (!isAppwriteReady()) {
    const newProp: Proposal = {
      ...data,
      $id: "p" + (mockProposals.length + 1),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
    };
    mockProposals = [newProp, ...mockProposals];
    return { success: true, data: newProp };
  }
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.PROPOSALS, ID.unique(), data);
    return { success: true, data: res as unknown as Proposal };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create proposal" };
  }
}
