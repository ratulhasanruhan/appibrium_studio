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

    const { databases, users } = createAdminClient();

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

    // 4. Create Client if not found (in DB and Appwrite Auth)
    if (!isExistingClient) {
      const cleanEmail = email.trim().toLowerCase();
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";

      // A. Create Appwrite Auth user FIRST
      try {
        await users.create(
          ID.unique(),
          cleanEmail,
          undefined, // phone
          undefined, // password (blank for magic links)
          name.trim()
        );
        console.log(`[Inquiries API] Created Appwrite Auth account for: ${cleanEmail}`);
      } catch (authErr: any) {
        // Appwrite code 409 means user already exists in Auth, which is fine
        if (authErr.code !== 409) {
          console.error("[Inquiries API] Auth account creation failed:", authErr);
          return NextResponse.json(
            { success: false, error: `Auth Error: ${authErr.message || "Failed to create Auth account"}. Check API key scopes.` },
            { status: 500, headers: CORS_HEADERS }
          );
        }
      }

      // B. Create client document in DB
      const clientDoc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.CLIENTS,
        ID.unique(),
        {
          name: name.trim(),
          email: cleanEmail,
          status: "lead"
        }
      );
      clientId = clientDoc.$id;

      // C. Create contact document in DB
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.CONTACTS,
        ID.unique(),
        {
          client_id: clientId,
          first_name: firstName,
          last_name: lastName,
          email: cleanEmail,
          role: "Primary Contact",
          is_primary: true
        }
      );

      // D. Trigger Magic URL token send via REST API POST request on the server side
      try {
        const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
        const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-magic-link`;

        const magicRes = await fetch(`${endpoint}/account/tokens/magic-url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": projectId,
          },
          body: JSON.stringify({
            userId: "unique()",
            email: cleanEmail,
            url: redirectUrl,
          }),
        });

        if (!magicRes.ok) {
          const magicData = await magicRes.json();
          throw new Error(magicData.message || "Appwrite Magic Link REST call failed");
        }
        console.log(`[Inquiries API] Sent Magic Link via Appwrite REST for email ${cleanEmail}`);
      } catch (magicErr: any) {
        console.error("[Inquiries API] Magic Link dispatch warning:", magicErr.message);
      }
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
