/**
 * Appibrium Studio - Appwrite Setup Script
 *
 * This script connects to Appwrite Cloud using the API key defined in .env.local
 * and automatically sets up:
 *   1. The database
 *   2. All collections
 *   3. All required attributes (strings, integers, booleans, floats)
 *   4. The storage bucket
 */

const fs = require("fs");
const path = require("path");
const { Client, Databases, Storage, Permission, Role } = require("node-appwrite");

// Helper: load environment variables manually from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found. Run: cp .env.local.example .env.local first.");
    process.exit(1);
  }
  const fileContent = fs.readFileSync(envPath, "utf-8");
  fileContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "appibrium_studio";
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "studio_files";

if (!projectId || !apiKey) {
  console.error("Error: NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in your .env.local file.");
  process.exit(1);
}

// Init Appwrite SDK Client
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Attributes definitions mapping to types/index.ts
const SCHEMA = {
  clients: [
    { key: "name", type: "string", required: true },
    { key: "legal_name", type: "string", required: false },
    { key: "email", type: "string", required: true },
    { key: "phone", type: "string", required: false },
    { key: "website", type: "string", required: false },
    { key: "address", type: "string", required: false },
    { key: "logo_url", type: "string", required: false },
    { key: "status", type: "string", required: true, default: "lead" },
  ],
  contacts: [
    { key: "client_id", type: "string", required: true },
    { key: "first_name", type: "string", required: true },
    { key: "last_name", type: "string", required: true },
    { key: "email", type: "string", required: true },
    { key: "phone", type: "string", required: false },
    { key: "role", type: "string", required: false },
    { key: "is_primary", type: "boolean", required: true, default: false },
  ],
  projects: [
    { key: "client_id", type: "string", required: true },
    { key: "name", type: "string", required: true },
    { key: "description", type: "string", required: false },
    { key: "status", type: "string", required: true, default: "planning" },
    { key: "start_date", type: "string", required: false },
    { key: "end_date", type: "string", required: false },
    { key: "budget", type: "double", required: false },
    { key: "currency", type: "string", required: true, default: "BDT" },
  ],
  proposals: [
    { key: "client_id", type: "string", required: true },
    { key: "title", type: "string", required: true },
    { key: "status", type: "string", required: true, default: "draft" },
    { key: "content_html", type: "string", required: false, size: 65535 },
    { key: "public_token", type: "string", required: true },
    { key: "version", type: "integer", required: true, default: 1 },
    { key: "currency", type: "string", required: true, default: "BDT" },
    { key: "sent_at", type: "string", required: false },
    { key: "viewed_at", type: "string", required: false },
    { key: "accepted_at", type: "string", required: false },
  ],
  invoices: [
    { key: "client_id", type: "string", required: true },
    { key: "project_id", type: "string", required: false },
    { key: "proposal_id", type: "string", required: false },
    { key: "title", type: "string", required: true },
    { key: "status", type: "string", required: true, default: "draft" },
    { key: "issue_date", type: "string", required: true },
    { key: "due_date", type: "string", required: true },
    { key: "subtotal", type: "double", required: true },
    { key: "tax", type: "double", required: true, default: 0 },
    { key: "discount", type: "double", required: true, default: 0 },
    { key: "total", type: "double", required: true },
    { key: "currency", type: "string", required: true, default: "BDT" },
    { key: "public_token", type: "string", required: true },
    { key: "notes", type: "string", required: false, size: 5000 },
  ],
  invoice_items: [
    { key: "invoice_id", type: "string", required: true },
    { key: "description", type: "string", required: true },
    { key: "quantity", type: "integer", required: true, default: 1 },
    { key: "unit_price", type: "double", required: true },
    { key: "amount", type: "double", required: true },
  ],
  transactions: [
    { key: "client_id", type: "string", required: false },
    { key: "invoice_id", type: "string", required: false },
    { key: "type", type: "string", required: true },
    { key: "amount", type: "double", required: true },
    { key: "currency", type: "string", required: true, default: "BDT" },
    { key: "status", type: "string", required: true, default: "completed" },
    { key: "category", type: "string", required: false },
    { key: "description", type: "string", required: true },
    { key: "transaction_date", type: "string", required: true },
  ],
  files_metadata: [
    { key: "client_id", type: "string", required: false },
    { key: "project_id", type: "string", required: false },
    { key: "name", type: "string", required: true },
    { key: "mime_type", type: "string", required: true },
    { key: "size_bytes", type: "integer", required: true },
    { key: "category", type: "string", required: true },
    { key: "version", type: "integer", required: true, default: 1 },
    { key: "uploaded_by", type: "string", required: true },
  ],
  notes: [
    { key: "client_id", type: "string", required: false },
    { key: "project_id", type: "string", required: false },
    { key: "title", type: "string", required: true },
    { key: "content", type: "string", required: true, size: 5000 },
    { key: "created_by", type: "string", required: true },
  ],
  notifications: [
    { key: "user_id", type: "string", required: true },
    { key: "title", type: "string", required: true },
    { key: "message", type: "string", required: true },
    { key: "type", type: "string", required: true },
    { key: "is_read", type: "boolean", required: true, default: false },
    { key: "link", type: "string", required: false },
  ],
  sms_logs: [
    { key: "to", type: "string", required: true },
    { key: "message", type: "string", required: true },
    { key: "entity_type", type: "string", required: true },
    { key: "entity_id", type: "string", required: true },
    { key: "status", type: "string", required: true, default: "sent" },
    { key: "provider_response", type: "string", required: false },
  ],
  workspace_settings: [
    { key: "company_name", type: "string", required: true },
    { key: "company_address", type: "string", required: true },
    { key: "company_email", type: "string", required: true },
    { key: "company_phone", type: "string", required: false },
    { key: "company_website", type: "string", required: false },
    { key: "company_logo_url", type: "string", required: false },
    { key: "default_currency", type: "string", required: true, default: "BDT" },
    { key: "bank_details", type: "string", required: true, size: 4000 },
    { key: "sms_api_url", type: "string", required: false },
    { key: "sms_api_key", type: "string", required: false },
    { key: "sms_sender_id", type: "string", required: false },
    { key: "resend_api_key", type: "string", required: false },
  ],
};

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: wait until attribute status is "available" or "failed"
async function waitAttributeReady(collId, attrKey) {
  while (true) {
    try {
      const attr = await databases.getAttribute(dbId, collId, attrKey);
      if (attr.status === "available") return true;
      if (attr.status === "failed") {
        console.error(`Attribute ${attrKey} creation failed inside collection ${collId}`);
        return false;
      }
    } catch (e) {
      // maybe not created yet
    }
    await sleep(800);
  }
}

async function run() {
  console.log("🚀 Starting Appwrite Database Provisioning...");

  // 1. Create Database if missing
  try {
    await databases.get(dbId);
    console.log(`Database "${dbId}" already exists.`);
  } catch (error) {
    console.log(`Creating database "${dbId}"...`);
    try {
      await databases.create(dbId, dbId);
      console.log(`Database "${dbId}" created successfully.`);
    } catch (dbErr) {
      console.error("Failed to create database:", dbErr);
      process.exit(1);
    }
  }

  // 2. Create Collections & Attributes
  for (const [collId, attrs] of Object.entries(SCHEMA)) {
    console.log(`\n📦 Checking Collection "${collId}"...`);
    const permissions = [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any())
    ];
    try {
      await databases.getCollection(dbId, collId);
      console.log(`Collection "${collId}" already exists. Updating permissions...`);
      await databases.updateCollection(dbId, collId, collId, permissions);
    } catch (error) {
      console.log(`Creating collection "${collId}"...`);
      await databases.createCollection(dbId, collId, collId, permissions);
      console.log(`Collection "${collId}" created successfully.`);
    }

    // Provision Attributes
    for (const attr of attrs) {
      try {
        await databases.getAttribute(dbId, collId, attr.key);
      } catch (attrErr) {
        console.log(`  Adding attribute "${attr.key}" (${attr.type})...`);
        const maxStrSize = attr.size || 255;
        if (attr.type === "string") {
          await databases.createStringAttribute(dbId, collId, attr.key, maxStrSize, attr.required, attr.required ? null : (attr.default || null));
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(dbId, collId, attr.key, attr.required, attr.required ? null : (attr.default ?? null));
        } else if (attr.type === "integer") {
          await databases.createIntegerAttribute(dbId, collId, attr.key, attr.required, null, null, attr.required ? null : (attr.default ?? null));
        } else if (attr.type === "double") {
          await databases.createFloatAttribute(dbId, collId, attr.key, attr.required, null, null, attr.required ? null : (attr.default ?? null));
        }
        // Appwrite operations are async, wait for it to be ready
        await waitAttributeReady(collId, attr.key);
      }
    }
    console.log(`Collection "${collId}" schema fully synchronized.`);
  }

  // 3. Create Storage Bucket
  console.log(`\n🗄️ Checking Storage Bucket "${bucketId}"...`);
  try {
    await storage.getBucket(bucketId);
    console.log(`Storage Bucket "${bucketId}" already exists.`);
  } catch (error) {
    console.log(`Creating Storage Bucket "${bucketId}"...`);
    try {
      await storage.createBucket(bucketId, bucketId);
      console.log(`Storage Bucket "${bucketId}" created successfully.`);
    } catch (bucketErr) {
      console.error("Failed to create storage bucket:", bucketErr);
    }
  }

  console.log("\n✅ Appwrite initialization complete. Appibrium Studio is fully provisioned!");
}

run().catch(console.error);
