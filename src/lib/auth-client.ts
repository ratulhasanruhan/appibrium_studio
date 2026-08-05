import { account } from "@/lib/appwrite/client";

/**
 * Authorization header carrying a short-lived Appwrite JWT.
 *
 * Our own API routes verify this to establish who is calling: the browser
 * proves its identity, and the server decides what that identity may do.
 */
export async function authHeader(): Promise<Record<string, string>> {
  const { jwt } = await account.createJWT();
  return { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
}
