"use server";

/**
 * Admin-only CRM operations. Kept in a separate "use server" file (rather than
 * services/crm.ts) so that only this narrow surface goes through the Server
 * Action pipeline and touches the secret APPWRITE_API_KEY — everything else in
 * crm.ts runs directly against the public client-side SDK, matching the rest
 * of the app's services.
 */

import { createAdminClient, ID, Query } from "@/lib/appwrite/server";
import { DB_ID, COLLECTIONS } from "@/lib/appwrite/client";
import { normalizeBDPhone } from "@/utils";
import type { Client, ActionResult } from "@/types";

export async function createClient(
  data: Omit<Client, "$id" | "$createdAt" | "$updatedAt">
): Promise<ActionResult<Client>> {
  try {
    // This runs on the server with no user session, so every call here must go
    // through the admin client — the browser SDK would be treated as a guest
    // and rejected by the staff-only collection permissions.
    const { users, databases } = createAdminClient();
    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Ensure Appwrite Auth user exists (or create it) FIRST
    try {
      const userList = await users.list([
        Query.equal("email", cleanEmail)
      ]);

      if (userList.users.length === 0) {
        // Create user account in Appwrite Auth system.
        // Appwrite requires phone numbers in strict E.164 format (+8801...),
        // but the CRM form accepts free-text input, so normalize it first.
        const normalizedPhone = data.phone ? normalizeBDPhone(data.phone) : undefined;
        try {
          await users.create(
            ID.unique(),
            cleanEmail,
            normalizedPhone,
            undefined, // password (keeps password empty, which is used for magic link login)
            data.name
          );
        } catch (phoneErr: any) {
          // A malformed phone number shouldn't block client creation — retry without it.
          if (normalizedPhone) {
            console.error("[CRM Server] Auth user creation with phone failed, retrying without phone:", phoneErr.message);
            await users.create(ID.unique(), cleanEmail, undefined, undefined, data.name);
          } else {
            throw phoneErr;
          }
        }
        console.log("[CRM Server] Successfully created Appwrite Auth user for:", cleanEmail);
      } else {
        console.log("[CRM Server] Appwrite Auth user already exists for:", cleanEmail);
      }
    } catch (authErr: any) {
      console.error("[CRM Server] Appwrite Auth creation failed:", authErr);
      return {
        success: false,
        error: `Appwrite Auth Error: ${authErr.message || "Access Denied"}. Please check that APPWRITE_API_KEY is correctly set in your environment variables with 'users.write' and 'users.read' scopes.`
      };
    }

    // 2. Create the client document
    const clientData = {
      ...data,
      email: cleanEmail,
    };
    const res = await databases.createDocument(DB_ID, COLLECTIONS.CLIENTS, ID.unique(), clientData);
    const clientId = res.$id;

    // 3. Create contact document as Primary Contact
    try {
      await databases.createDocument(DB_ID, COLLECTIONS.CONTACTS, ID.unique(), {
        client_id: clientId,
        first_name: data.name,
        last_name: "",
        email: cleanEmail,
        phone: data.phone || undefined,
        role: "Primary Contact",
        is_primary: true,
      });
      console.log("[CRM Server] Successfully created linked Contact record.");
    } catch (contactErr: any) {
      console.error("[CRM Server] Linked contact creation warning:", contactErr.message);
    }

    return { success: true, data: res as unknown as Client };
  } catch (error: any) {
    console.error("[CRM] createClient error:", error);
    return { success: false, error: error.message || "Failed to create client" };
  }
}
