/**
 * Draft proposal + internal notification for a public inquiry.
 *
 * The public inquiry form used to write these straight from the browser, which
 * required anonymous write access to the proposals and notifications
 * collections. It posts here instead so those writes happen server-side.
 */

import { NextResponse } from "next/server";
import { createAdminClient, ID } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";

export async function POST(request: Request) {
  try {
    const { clientId, title, contentHtml, publicToken, companyName } = await request.json();
    if (!clientId || !contentHtml || !publicToken) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { databases } = createAdminClient();

    const proposal = await databases.createDocument(DB_ID, COLLECTIONS.PROPOSALS, ID.unique(), {
      client_id: clientId,
      title: title || `${companyName || "Client"} Project Scope`,
      status: "draft",
      content_html: String(contentHtml).trim(),
      public_token: publicToken,
      version: 1,
      currency: "BDT",
    });

    try {
      await databases.createDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
        user_id: "admin",
        title: "New Inquiry Received",
        message: `${companyName || "A client"} has submitted an inquiry for "${title}". A draft proposal has been generated.`,
        type: "project_updated",
        is_read: false,
        link: "/inquiries",
      });
    } catch (notifyErr) {
      console.error("[api/public/inquiry] notification failed:", notifyErr);
    }

    return NextResponse.json({ success: true, proposalId: proposal.$id });
  } catch (error: unknown) {
    console.error("[api/public/inquiry] failed:", error);
    return NextResponse.json({ error: "Could not submit the inquiry." }, { status: 500 });
  }
}
