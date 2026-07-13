import { Topbar } from "@/components/topbar";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Files" };
export default function FilesPage() {
  return (
    <>
      <Topbar title="Files" subtitle="Contracts, designs, and documents" />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>Files module — coming soon.</p>
        </div>
      </div>
    </>
  );
}
