import { Client, Users, Databases, Account, ID, Query } from "node-appwrite";

export interface CallerIdentity {
  userId: string;
  email: string;
  name: string;
  labels: string[];
}

/**
 * Identifies the caller from a short-lived Appwrite JWT minted in the browser.
 *
 * The browser proves who it is; the server then decides what that identity is
 * allowed to see. Never trust an email or client id sent in the request body —
 * only what Appwrite itself confirms here.
 */
export async function getCaller(request: Request): Promise<CallerIdentity | null> {
  const header = request.headers.get("authorization") || "";
  const jwt = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!jwt) return null;

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
      .setJWT(jwt);
    const user = await new Account(client).get();
    return {
      userId: user.$id,
      email: (user.email || "").trim().toLowerCase(),
      name: user.name || "",
      labels: ((user as unknown as { labels?: string[] }).labels) || [],
    };
  } catch {
    return null;
  }
}

export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  return {
    get users() {
      return new Users(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

/**
 * Copies an Appwrite document into a plain object.
 *
 * node-appwrite returns documents with a null prototype, and React refuses to
 * pass those from a Server Action back to a Client Component — the action's
 * work succeeds and then serialising the reply throws "Only plain objects...
 * can be passed to Client Components", which surfaces as a generic failure
 * even though everything was written correctly.
 */
export function toPlain<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export { ID, Query };
