import { account } from "@/lib/appwrite/client";
import type { Client, Project, Invoice, Proposal, FileMetadata, Notification } from "@/types";

export interface PortalData {
  /** True when the caller is staff — they read Appwrite directly instead. */
  staff?: boolean;
  client: Client | null;
  projects: Project[];
  invoices: Invoice[];
  proposals: Proposal[];
  files: FileMetadata[];
  notifications: Notification[];
}

const EMPTY: PortalData = {
  client: null, projects: [], invoices: [], proposals: [], files: [], notifications: [],
};

/**
 * Short-lived token proving to our API who the browser is signed in as.
 * Collections are staff-only, so client users reach their data through the
 * portal API rather than querying Appwrite directly.
 */
async function authHeader(): Promise<Record<string, string>> {
  const { jwt } = await account.createJWT();
  return { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
}

export async function getPortalData(): Promise<PortalData> {
  try {
    const res = await fetch("/api/portal", { headers: await authHeader() });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return data.staff ? { ...EMPTY, staff: true } : { ...EMPTY, ...data };
  } catch (error) {
    console.error("[Portal] getPortalData error:", error);
    return EMPTY;
  }
}

export async function updateOwnClientProfile(
  patch: Partial<Pick<Client, "name" | "legal_name" | "phone" | "website" | "address">>
): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    const res = await fetch("/api/portal", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Could not save your details." };
    return { success: true, client: data.client };
  } catch (error) {
    console.error("[Portal] updateOwnClientProfile error:", error);
    return { success: false, error: "Could not save your details." };
  }
}
