import { NextResponse } from "next/server";
import { createAdminClient, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Client ID is required." }, { status: 400 });
    }

    const { databases, users } = createAdminClient();

    // 1. Fetch Client document to retrieve email
    const client = await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    const email = client.email;

    // 2. Find and delete the user account in Appwrite Auth system by email
    if (email) {
      try {
        const userList = await users.list([
          Query.equal("email", email.trim().toLowerCase())
        ]);

        if (userList.users.length > 0) {
          const authUserId = userList.users[0].$id;
          await users.delete(authUserId);
          console.log(`[Delete Client API] Deleted Appwrite Auth user ${authUserId} for email ${email}`);
        }
      } catch (authErr: any) {
        console.error(`[Delete Client API] Appwrite Auth user deletion error:`, authErr);
        return NextResponse.json({
          success: false,
          error: `Appwrite Auth Deletion Error: ${authErr.message || "Access Denied"}. Make sure APPWRITE_API_KEY is correctly set in your live environment variables with 'users.write' scope.`
        }, { status: 500 });
      }
    }

    // 3. Delete linked Contacts
    try {
      const contactsList = await databases.listDocuments(DB_ID, COLLECTIONS.CONTACTS, [
        Query.equal("client_id", id)
      ]);
      await Promise.all(
        contactsList.documents.map((contact) =>
          databases.deleteDocument(DB_ID, COLLECTIONS.CONTACTS, contact.$id)
        )
      );
      console.log(`[Delete Client API] Deleted linked contacts for client ID ${id}`);
    } catch (contactErr: any) {
      console.error(`[Delete Client API] Linked contacts deletion warning:`, contactErr.message);
    }

    // 4. Delete Client document from DB
    await databases.deleteDocument(DB_ID, COLLECTIONS.CLIENTS, id);
    console.log(`[Delete Client API] Deleted database client record for ID ${id}`);

    return NextResponse.json({ success: true, message: "Client deleted successfully from Auth and Database." });
  } catch (error: any) {
    console.error("[Delete Client API] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
