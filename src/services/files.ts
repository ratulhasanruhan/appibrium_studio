import { databases, storage, DB_ID, COLLECTIONS, BUCKETS, ID, Query } from "@/lib/appwrite/client";
import type { FileMetadata, ActionResult } from "@/types";

export async function getFilesMetadata(): Promise<FileMetadata[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.FILES_METADATA, [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    return res.documents as unknown as FileMetadata[];
  } catch (error) {
    console.error("[Files] getFilesMetadata error:", error);
    return [];
  }
}

export async function uploadFile(
  file: File,
  clientId?: string,
  projectId?: string
): Promise<ActionResult<FileMetadata>> {
  try {
    // 1. Upload to storage
    const fileId = ID.unique();
    const uploadRes = await storage.createFile(BUCKETS.FILES, fileId, file);

    // 2. Insert metadata document
    const metadata: Record<string, any> = {
      name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      category: "document",
      version: 1,
      uploaded_by: "Admin",
    };

    if (clientId) metadata.client_id = clientId;
    if (projectId) metadata.project_id = projectId;

    const docRes = await databases.createDocument(DB_ID, COLLECTIONS.FILES_METADATA, fileId, metadata);
    return { success: true, data: docRes as unknown as FileMetadata };
  } catch (error: any) {
    console.error("[Files] uploadFile error:", error);
    return { success: false, error: error.message || "Failed to upload file." };
  }
}

export async function deleteFile(id: string): Promise<ActionResult<void>> {
  try {
    await storage.deleteFile(BUCKETS.FILES, id);
    await databases.deleteDocument(DB_ID, COLLECTIONS.FILES_METADATA, id);
    return { success: true };
  } catch (error: any) {
    console.error("[Files] deleteFile error:", error);
    return { success: false, error: error.message || "Failed to delete file." };
  }
}

export function getFileDownloadUrl(id: string): string {
  return storage.getFileDownload(BUCKETS.FILES, id).toString();
}
