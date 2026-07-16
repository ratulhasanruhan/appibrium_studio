import { NextResponse } from "next/server";
import { createAdminClient, ID, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, firstName, lastName, email, phone, website, address } = body;

    if (!email || !companyName || !firstName || !lastName) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const { databases } = createAdminClient();

    // 1. Check if client document already exists in DB
    const clientList = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
      Query.equal("email", cleanEmail),
    ]);

    let clientId = "";
    if (clientList.documents.length === 0) {
      // Create new client document
      const clientDoc = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), {
        name: companyName,
        legal_name: companyName,
        email: cleanEmail,
        phone,
        website,
        address,
        status: "active",
      });
      clientId = clientDoc.$id;

      // Create contact document
      await databases.createDocument(DB_ID, COLLECTIONS.CONTACTS, ID.unique(), {
        client_id: clientId,
        first_name: firstName,
        last_name: lastName,
        email: cleanEmail,
        phone,
        role: "Primary Contact",
        is_primary: true,
      });

      // Create user account in Appwrite Auth system
      try {
        const { users } = createAdminClient();
        await users.create(
          ID.unique(),
          cleanEmail,
          undefined, // phone (keep undefined to avoid parsing/formatting validation issues)
          undefined, // password (blank for magic links)
          `${firstName.trim()} ${lastName.trim()}`.trim()
        );
      } catch (authErr: any) {
        // Appwrite code 409 means user already exists in Auth, which is safe to ignore
        if (authErr.code === 409) {
          console.log("[Register API] User already exists in Auth system, skipping creation.");
        } else {
          throw authErr;
        }
      }
    }

    return NextResponse.json({ success: true, message: "Client database record ready." });
  } catch (error: any) {
    console.error("[Register API] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
