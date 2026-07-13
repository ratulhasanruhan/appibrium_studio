import { Topbar } from "@/components/topbar";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Analytics" };
export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" subtitle="Revenue trends and business insights" />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>Analytics module — coming soon.</p>
        </div>
      </div>
    </>
  );
}
