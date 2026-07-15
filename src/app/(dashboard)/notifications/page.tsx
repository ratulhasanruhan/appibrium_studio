import { Topbar } from "@/components/topbar";
import { NotificationsList } from "@/modules/notifications/notifications-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications · Appibrium Studio" };

export default function NotificationsPage() {
  return (
    <>
      <Topbar title="Notifications" subtitle="Track proposals, invoices, and system updates" />
      <div className="page-content">
        <NotificationsList />
      </div>
    </>
  );
}
