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
    const { databases, users } = createAdminClient();

    let isNewUserCreated = false;

    // 1. Ensure Appwrite Auth user exists (or create it) FIRST
    try {
      const userList = await users.list([
        Query.equal("email", cleanEmail)
      ]);

      if (userList.users.length === 0) {
        // Create user account in Appwrite Auth system
        await users.create(
          ID.unique(),
          cleanEmail,
          undefined, // phone
          undefined, // password
          `${firstName.trim()} ${lastName.trim()}`.trim()
        );
        isNewUserCreated = true;
        console.log("[Register API] Successfully created Appwrite Auth user for:", cleanEmail);
      } else {
        console.log("[Register API] Appwrite Auth user already exists for:", cleanEmail);
      }
    } catch (authErr: any) {
      console.error("[Register API] Appwrite Auth creation failed:", authErr);
      return NextResponse.json({
        success: false,
        error: `Appwrite Auth Error: ${authErr.message || "Access Denied"}. Please check that APPWRITE_API_KEY is correctly set in your live environment variables with 'users.write' and 'users.read' scopes.`
      }, { status: 500 });
    }

    // 2. Check if client document already exists in DB
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
      isNewUserCreated = true;
      console.log("[Register API] Successfully created database records for new client.");
    } else {
      clientId = clientList.documents[0].$id;
      console.log("[Register API] Database client records already exist.");
    }

    return NextResponse.json({ success: true, clientId, isNew: isNewUserCreated });
  } catch (error: any) {
    console.error("[Register API] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
