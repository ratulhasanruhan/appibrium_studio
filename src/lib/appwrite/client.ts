import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

// ─── Browser (Client-side) Appwrite Client ────────────────────────────── //
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "");

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);

// Add standard ping method helper to check Appwrite backend connectivity
if (!(client as any).ping) {
  (client as any).ping = async () => {
    try {
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
      const res = await fetch(`${endpoint}/health`, {
        headers: {
          "x-appwrite-project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ""
        }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };
}

export { client, ID, Query };

// ─── Database & Collection IDs ─────────────────────────────────────────── //

export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "appibrium_studio";

export const COLLECTIONS = {
  CLIENTS:           process.env.NEXT_PUBLIC_COL_CLIENTS           ?? "clients",
  CONTACTS:          process.env.NEXT_PUBLIC_COL_CONTACTS          ?? "contacts",
  PROJECTS:          process.env.NEXT_PUBLIC_COL_PROJECTS          ?? "projects",
  PROPOSALS:         process.env.NEXT_PUBLIC_COL_PROPOSALS         ?? "proposals",
  INVOICES:          process.env.NEXT_PUBLIC_COL_INVOICES          ?? "invoices",
  INVOICE_ITEMS:     process.env.NEXT_PUBLIC_COL_INVOICE_ITEMS     ?? "invoice_items",
  TRANSACTIONS:      process.env.NEXT_PUBLIC_COL_TRANSACTIONS      ?? "transactions",
  FILES_METADATA:    process.env.NEXT_PUBLIC_COL_FILES_METADATA    ?? "files_metadata",
  NOTES:             process.env.NEXT_PUBLIC_COL_NOTES             ?? "notes",
  NOTIFICATIONS:     process.env.NEXT_PUBLIC_COL_NOTIFICATIONS     ?? "notifications",
  AUDIT_LOGS:        process.env.NEXT_PUBLIC_COL_AUDIT_LOGS        ?? "audit_logs",
  SMS_LOGS:          process.env.NEXT_PUBLIC_COL_SMS_LOGS          ?? "sms_logs",
  WORKSPACE_SETTINGS:process.env.NEXT_PUBLIC_COL_WORKSPACE_SETTINGS ?? "workspace_settings",
  QUOTES:             process.env.NEXT_PUBLIC_COL_QUOTES             ?? "quotes",
} as const;

export const BUCKETS = {
  FILES: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ?? "studio_files",
} as const;
