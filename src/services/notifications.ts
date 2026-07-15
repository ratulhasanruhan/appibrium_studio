import { databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";
import type { Notification, ActionResult } from "@/types";

export async function getNotifications(): Promise<Notification[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTIFICATIONS, [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    return res.documents as unknown as Notification[];
  } catch (error) {
    console.error("[Notifications] getNotifications error:", error);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<ActionResult<void>> {
  try {
    await databases.updateDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, id, {
      is_read: true,
    });
    return { success: true };
  } catch (error: any) {
    console.error("[Notifications] markNotificationAsRead error:", error);
    return { success: false, error: error.message || "Failed to mark as read." };
  }
}
