/**
 * Token-gated public document API.
 *
 * Client-facing pages (invoice, proposal, letter, team report) used to query
 * Appwrite straight from the browser, which forced the collections to allow
 * anonymous access — meaning anyone holding the public project ID could read
 * or destroy the whole database.
 *
 * All of that data now flows through here instead. The share token is the
 * capability: it resolves exactly one record and nothing else, and every query
 * runs server-side with the admin key so no credentials reach the browser.
 */

import { NextResponse } from "next/server";
import { createAdminClient, ID, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";

type DocType = "invoice" | "proposal" | "letter" | "team";

const COLLECTION_FOR: Record<DocType, string> = {
  invoice: COLLECTIONS.INVOICES,
  proposal: COLLECTIONS.PROPOSALS,
  letter: COLLECTIONS.LETTERS,
  team: COLLECTIONS.PEOPLE,
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolves the single record a share token points at. */
async function resolveByToken(type: DocType, token: string) {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DB_ID, COLLECTION_FOR[type], [
    Query.equal("public_token", token),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as DocType | null;
  const token = url.searchParams.get("token");

  if (!type || !(type in COLLECTION_FOR)) return bad("Unknown document type.");
  if (!token || token.length < 6) return bad("A valid token is required.");

  try {
    const { databases } = createAdminClient();
    const doc = await resolveByToken(type, token);
    if (!doc) return bad("Not found.", 404);

    // Company details are shown on every public document.
    let company: Record<string, unknown> | null = null;
    let bank: unknown = null;
    try {
      const settings = await databases.listDocuments(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, [Query.limit(1)]);
      const s = settings.documents[0] as unknown as Record<string, string> | undefined;
      if (s) {
        company = {
          name: s.company_name, address: s.company_address, email: s.company_email,
          phone: s.company_phone, website: s.company_website, logo_url: s.company_logo_url,
        };
        if (s.bank_details) {
          try { bank = typeof s.bank_details === "string" ? JSON.parse(s.bank_details) : s.bank_details; }
          catch { bank = null; }
        }
      }
    } catch { /* fall back to app defaults client-side */ }

    if (type === "invoice") {
      const [client, items] = await Promise.all([
        doc.client_id ? databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, doc.client_id as string).catch(() => null) : null,
        databases.listDocuments(DB_ID, COLLECTIONS.INVOICE_ITEMS, [
          Query.equal("invoice_id", doc.$id), Query.orderAsc("$createdAt"),
        ]).then((r) => r.documents).catch(() => []),
      ]);
      return NextResponse.json({ invoice: doc, client, items, company, bank });
    }

    if (type === "proposal") {
      const client = doc.client_id
        ? await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, doc.client_id as string).catch(() => null)
        : null;
      return NextResponse.json({ proposal: doc, client, company });
    }

    if (type === "letter") {
      const client = doc.client_id
        ? await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, doc.client_id as string).catch(() => null)
        : null;
      return NextResponse.json({ letter: doc, client, company });
    }

    // team report — the person's own assignments and payments only
    const [engagements, payouts, projects] = await Promise.all([
      databases.listDocuments(DB_ID, COLLECTIONS.ENGAGEMENTS, [
        Query.equal("person_id", doc.$id), Query.limit(100),
      ]).then((r) => r.documents).catch(() => []),
      databases.listDocuments(DB_ID, COLLECTIONS.TRANSACTIONS, [
        Query.equal("person_id", doc.$id), Query.limit(100),
      ]).then((r) => r.documents).catch(() => []),
      databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, [Query.limit(100)])
        .then((r) => r.documents.map((p) => ({ $id: p.$id, name: p.name })))
        .catch(() => []),
    ]);
    return NextResponse.json({ person: doc, engagements, payouts, projects, company });
  } catch (error: unknown) {
    console.error("[api/public] GET failed:", error);
    return bad("Could not load this document.", 500);
  }
}

/**
 * The few state changes a recipient is allowed to make on their own document.
 * Anything not listed here is rejected, so a token can never be used to write
 * arbitrary fields.
 */
export async function POST(request: Request) {
  try {
    const { type, token, action, name } = await request.json();
    if (!type || !(type in COLLECTION_FOR)) return bad("Unknown document type.");
    if (!token) return bad("A valid token is required.");

    const doc = await resolveByToken(type as DocType, token);
    if (!doc) return bad("Not found.", 404);

    const { databases } = createAdminClient();
    const now = new Date().toISOString();
    let patch: Record<string, unknown> | null = null;

    if (type === "invoice" && action === "view") {
      patch = doc.status === "sent" ? { viewed_at: now } : {};
    } else if (type === "proposal") {
      if (action === "view") patch = doc.status === "sent" ? { status: "viewed", viewed_at: now } : {};
      if (action === "accept") patch = { status: "accepted", accepted_at: now };
      if (action === "reject") patch = { status: "rejected" };
    } else if (type === "letter") {
      if (action === "view") patch = doc.status === "sent" ? { status: "viewed", viewed_at: now } : {};
      if (action === "sign") patch = { status: "signed", signed_at: now, signed_by_name: String(name || "") };
      if (action === "decline") patch = { status: "declined" };
    }

    if (patch === null) return bad("That action is not allowed.", 403);
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, document: doc });

    const updated = await databases.updateDocument(DB_ID, COLLECTION_FOR[type as DocType], doc.$id, patch);

    // Accepting a proposal opens the project it describes, once.
    if (type === "proposal" && action === "accept" && doc.status !== "accepted") {
      try {
        const existing = await databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, [
          Query.equal("client_id", doc.client_id as string), Query.limit(100),
        ]);
        if (!existing.documents.some((p) => p.name === doc.title)) {
          await databases.createDocument(DB_ID, COLLECTIONS.PROJECTS, ID.unique(), {
            name: doc.title,
            client_id: doc.client_id,
            description: `Project initialised automatically from accepted proposal "${doc.title}".`,
            status: "active",
            currency: doc.currency || "BDT",
          });
        }
      } catch (projErr) {
        console.error("[api/public] project creation after accept failed:", projErr);
      }
    }

    return NextResponse.json({ ok: true, document: updated });
  } catch (error: unknown) {
    console.error("[api/public] POST failed:", error);
    return bad("Could not update this document.", 500);
  }
}
