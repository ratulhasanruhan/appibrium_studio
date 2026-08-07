import { databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";
import type { Proposal, ActionResult } from "@/types";
import { acceptancePatch, openProjectForProposal } from "@/lib/proposal-accept";

// ── Proposals ────────────────────────────────────────────────────────────── //

export async function getProposals(clientId?: string): Promise<Proposal[]> {
  try {
    const queries = [Query.orderDesc("$createdAt"), Query.limit(100)];
    if (clientId) queries.push(Query.equal("client_id", clientId));
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROPOSALS, queries);
    return res.documents as unknown as Proposal[];
  } catch (error) {
    console.error("[Proposals] getProposals error:", error);
    return [];
  }
}

export async function getProposal(id: string): Promise<Proposal | null> {
  try {
    const res = await databases.getDocument(DB_ID, COLLECTIONS.PROPOSALS, id);
    return res as unknown as Proposal;
  } catch (error) {
    console.error(`[Proposals] getProposal(${id}) error:`, error);
    return null;
  }
}

export async function getProposalByToken(token: string): Promise<Proposal | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROPOSALS, [
      Query.equal("public_token", token),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return res.documents[0] as unknown as Proposal;
  } catch (error) {
    console.error(`[Proposals] getProposalByToken(${token}) error:`, error);
    return null;
  }
}

export async function createProposal(
  data: Omit<Proposal, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Proposal>> {
  try {
    const res = await databases.createDocument(DB_ID, COLLECTIONS.PROPOSALS, ID.unique(), data);
    return { success: true, data: res as unknown as Proposal };
  } catch (error: any) {
    console.error("[Proposals] createProposal error:", error);
    return { success: false, error: error.message || "Failed to create proposal" };
  }
}

export async function updateProposal(
  id: string,
  data: Partial<Omit<Proposal, "$id" | "$createdAt" | "$updatedAt">>
): Promise<ActionResult<Proposal>> {
  try {
    const res = await databases.updateDocument(DB_ID, COLLECTIONS.PROPOSALS, id, data);
    return { success: true, data: res as unknown as Proposal };
  } catch (error: any) {
    console.error("[Proposals] updateProposal error:", error);
    return { success: false, error: error.message || "Failed to update proposal" };
  }
}

/**
 * Record an acceptance that happened away from the share link.
 *
 * Plenty of proposals are agreed on a call or in a meeting and never get
 * clicked. Marking one accepted by hand used to mean editing the status and
 * then remembering to open the project yourself — so the two drifted apart.
 * This runs the same rules the client's own accept runs, and notes that the
 * acceptance was recorded internally rather than signed.
 */
export async function acceptProposalInternally(
  proposal: Proposal,
  acceptedBy: string
): Promise<ActionResult<{ project: "created" | "exists" | "failed" }>> {
  try {
    const alreadyAccepted = proposal.status === "accepted";
    const patch = acceptancePatch(acceptedBy, "admin");
    await databases.updateDocument(DB_ID, COLLECTIONS.PROPOSALS, proposal.$id, patch);

    // Skipped when it was already accepted: the project was opened then.
    const project = alreadyAccepted
      ? "exists"
      : await openProjectForProposal(proposal, {
          async existingProjectNames(clientId) {
            const list = await databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, [
              Query.equal("client_id", clientId),
              Query.limit(100),
            ]);
            return list.documents.map((p) => String(p.name));
          },
          createProject: (data) =>
            databases.createDocument(DB_ID, COLLECTIONS.PROJECTS, ID.unique(), data),
        });

    return { success: true, data: { project } };
  } catch (error: unknown) {
    console.error("[Proposals] acceptProposalInternally error:", error);
    const message = error instanceof Error ? error.message : "Failed to accept proposal";
    return { success: false, error: message };
  }
}

export async function deleteProposal(id: string): Promise<ActionResult<void>> {
  try {
    await databases.deleteDocument(DB_ID, COLLECTIONS.PROPOSALS, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete proposal" };
  }
}
