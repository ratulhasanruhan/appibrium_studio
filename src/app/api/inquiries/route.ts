import { NextResponse } from "next/server";
import { createAdminClient, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS, ID } from "@/lib/appwrite/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Appibrium-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  try {
    // 1. Verify API Key
    const clientApiKey = request.headers.get("X-Appibrium-API-Key");
    const serverApiKey = process.env.INQUIRY_API_KEY;

    if (serverApiKey && clientApiKey !== serverApiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access key." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { name, email, service, message } = await request.json();

    // 2. Input Validation
    if (!name || !email || !service || !message) {
      return NextResponse.json(
        { success: false, error: "All fields are required (name, email, service, message)." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { databases } = createAdminClient();

    // 3. Email rate-limiting / spam protection
    // Check if client already exists with this email
    const clientList = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
      Query.equal("email", email.trim().toLowerCase()),
      Query.limit(1)
    ]);

    let clientId = "";
    let isExistingClient = false;

    if (clientList.documents.length > 0) {
      clientId = clientList.documents[0].$id;
      isExistingClient = true;

      // Rate limit check: see if they submitted a quote recently
      const recentQuotes = await databases.listDocuments(DB_ID, COLLECTIONS.QUOTES, [
        Query.equal("client_id", clientId),
        Query.orderDesc("$createdAt"),
        Query.limit(1)
      ]);

      if (recentQuotes.documents.length > 0) {
        const lastCreated = new Date(recentQuotes.documents[0].$createdAt).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastCreated) / (1000 * 60);

        if (diffMinutes < 2) {
          return NextResponse.json(
            { success: false, error: "Please wait a moment before sending another request." },
            { status: 429, headers: CORS_HEADERS }
          );
        }
      }
    }

    // 4. Create Client if not found
    if (!isExistingClient) {
      const clientDoc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.CLIENTS,
        ID.unique(),
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          status: "lead"
        }
      );
      clientId = clientDoc.$id;

      // Create contact document
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.CONTACTS,
        ID.unique(),
        {
          client_id: clientId,
          first_name: firstName,
          last_name: lastName,
          email: email.trim().toLowerCase(),
          role: "Primary Contact",
          is_primary: true
        }
      );
    }

    // 5. Create Quote (status: "pending")
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.QUOTES,
      ID.unique(),
      {
        client_id: clientId,
        service: service.trim(),
        message: message.trim(),
        status: "pending"
      }
    );

    // 6. Create internal Notification for CRM Admins
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      {
        user_id: "admin",
        title: "New Inquiry Submitted",
        message: `${name} has submitted an inquiry for "${service}".`,
        type: "project_updated",
        is_read: false,
        link: `/inquiries`
      }
    );

    return NextResponse.json(
      { success: true, clientId },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("[Inquiries API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
