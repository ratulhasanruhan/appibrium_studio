/**
 * Client portal API.
 *
 * Collections are readable only by staff, so a client signing in with their
 * magic link cannot query Appwrite directly. Their portal data comes from here
 * instead: the JWT proves who they are, and the server returns records scoped
 * to their own client record and nothing else.
 *
 * The client id is always resolved from the authenticated email — never taken
 * from the request — so a caller cannot ask for someone else's data.
 */

import { NextResponse } from "next/server";
import { createAdminClient, getCaller, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";
import { ADMIN_ROLES } from "@/utils";

const LIMIT = 100;

function unauthorised() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

/** The client record belonging to the signed-in email, if any. */
async function resolveOwnClient(email: string) {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
    Query.equal("email", email),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function GET(request: Request) {
  const caller = await getCaller(request);
  if (!caller) return unauthorised();

  const isStaff = caller.labels.some((l) => ADMIN_ROLES.includes(l.toLowerCase()));
  if (isStaff) {
    // Staff read Appwrite directly; this route exists for scoped access only.
    return NextResponse.json({ staff: true });
  }

  try {
    const client = await resolveOwnClient(caller.email);
    if (!client) {
      return NextResponse.json({
        client: null, projects: [], invoices: [], proposals: [], files: [], notifications: [],
      });
    }

    const { databases } = createAdminClient();
    const own = [Query.equal("client_id", client.$id), Query.limit(LIMIT)];
    const [projects, invoices, proposals, files] = await Promise.all([
      databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, own).then((r) => r.documents).catch(() => []),
      databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, own).then((r) => r.documents).catch(() => []),
      databases.listDocuments(DB_ID, COLLECTIONS.PROPOSALS, own).then((r) => r.documents).catch(() => []),
      databases.listDocuments(DB_ID, COLLECTIONS.FILES_METADATA, own).then((r) => r.documents).catch(() => []),
    ]);

    // Notifications addressed to this user, plus workspace-wide ones.
    const notifications = await databases
      .listDocuments(DB_ID, COLLECTIONS.NOTIFICATIONS, [
        Query.equal("user_id", caller.userId),
        Query.limit(LIMIT),
      ])
      .then((r) => r.documents)
      .catch(() => []);

    return NextResponse.json({ client, projects, invoices, proposals, files, notifications });
  } catch (error: unknown) {
    console.error("[api/portal] GET failed:", error);
    return NextResponse.json({ error: "Could not load your workspace." }, { status: 500 });
  }
}

/** Lets a client correct their own company details, and nothing else. */
export async function POST(request: Request) {
  const caller = await getCaller(request);
  if (!caller) return unauthorised();

  try {
    const body = await request.json();
    const client = await resolveOwnClient(caller.email);
    if (!client) return NextResponse.json({ error: "No client record." }, { status: 404 });

    const allowed = ["name", "legal_name", "phone", "website", "address"] as const;
    const patch: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof body[key] === "string" && body[key].trim()) patch[key] = body[key].trim();
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { databases } = createAdminClient();
    const updated = await databases.updateDocument(DB_ID, COLLECTIONS.CLIENTS, client.$id, patch);
    return NextResponse.json({ success: true, client: updated });
  } catch (error: unknown) {
    console.error("[api/portal] POST failed:", error);
    return NextResponse.json({ error: "Could not save your details." }, { status: 500 });
  }
}
