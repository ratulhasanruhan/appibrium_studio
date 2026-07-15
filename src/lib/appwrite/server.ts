import { Client, Users, Databases, ID, Query } from "node-appwrite";

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

export { ID, Query };
