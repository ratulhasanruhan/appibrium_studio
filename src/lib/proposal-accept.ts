/**
 * What it means for a proposal to be accepted.
 *
 * Acceptance arrives from two directions: the client clicks accept on their
 * share link (server side, admin SDK), or you record an acceptance that was
 * agreed offline — over a call, in a meeting, by reply — from the proposals
 * list (browser side, staff session). Both must have identical consequences,
 * so the rules live here instead of being written twice against two SDKs.
 *
 * Only the policy is shared. Each caller keeps its own database plumbing and
 * passes it in, which is why this module imports no SDK at all.
 */

export interface AcceptableProposal {
  $id: string;
  client_id: string;
  title: string;
  status: string;
  currency?: string;
}

/** How the acceptance was obtained — kept on the record for later reference. */
export type AcceptanceSource = "client" | "admin";

/**
 * The fields to write on the proposal itself.
 *
 * `acceptedBy` names whoever agreed: the client on their own link, or the
 * person you spoke to when you record it internally. It is what distinguishes
 * a signature from a note-to-file, so it is never silently blank.
 */
export function acceptancePatch(
  acceptedBy: string,
  source: AcceptanceSource,
  now: string = new Date().toISOString()
): Record<string, string> {
  const who = acceptedBy.trim() || "Client";
  return {
    status: "accepted",
    accepted_at: now,
    accepted_by: source === "admin" ? `${who} (recorded internally)` : who,
  };
}

export interface ProjectOpener {
  /** Names of the client's existing projects, used to avoid a duplicate. */
  existingProjectNames(clientId: string): Promise<string[]>;
  createProject(data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Open the project the proposal describes — once.
 *
 * A proposal can be accepted twice (a client reloads and clicks again, or you
 * record offline agreement for one they had already accepted), so this is
 * keyed on the project not already existing rather than on the click.
 *
 * Failure here is reported, never thrown: the acceptance itself is the thing
 * that must not be lost, and a missing project is trivially fixed by hand.
 */
export async function openProjectForProposal(
  proposal: AcceptableProposal,
  io: ProjectOpener
): Promise<"created" | "exists" | "failed"> {
  try {
    const names = await io.existingProjectNames(proposal.client_id);
    if (names.includes(proposal.title)) return "exists";

    await io.createProject({
      name: proposal.title,
      client_id: proposal.client_id,
      description: `Project initialised automatically from accepted proposal "${proposal.title}".`,
      status: "active",
      currency: proposal.currency || "BDT",
    });
    return "created";
  } catch (error) {
    console.error("[proposal-accept] could not open the project:", error);
    return "failed";
  }
}
