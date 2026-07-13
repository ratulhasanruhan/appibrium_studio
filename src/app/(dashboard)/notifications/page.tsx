import { Topbar } from "@/components/topbar";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Notifications" };
export default function NotificationsPage() {
  return (
    <>
      <Topbar title="Notifications" subtitle="Activity alerts and updates" />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>Notifications — coming soon.</p>
        </div>
      </div>
    </>
  );
}
