import { NextResponse } from "next/server";
import { createAdminClient, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const { databases } = createAdminClient();

    // Verify client exists in the DB
    const clientList = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
      Query.equal("email", email),
    ]);

    if (clientList.documents.length === 0) {
      return NextResponse.json({ success: false, error: "No client account found with this email. Please register first." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Client exists." });
  } catch (error: any) {
    console.error("[Magic Link API] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
