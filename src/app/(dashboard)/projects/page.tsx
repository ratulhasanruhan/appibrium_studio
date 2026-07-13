import { Topbar } from "@/components/topbar";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Projects" };
export default function ProjectsPage() {
  return (
    <>
      <Topbar title="Projects" subtitle="All client projects"
        actions={<button id="new-project-btn" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}><Plus size={13} />New Project</button>}
      />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>Projects module — coming soon.</p>
        </div>
      </div>
    </>
  );
}
