import { Topbar } from "@/components/topbar";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "AI Assistant" };
export default function AssistantPage() {
  return (
    <>
      <Topbar title="AI Assistant" subtitle="Powered by Qwen · Alibaba Cloud" />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>AI Assistant — coming soon.</p>
        </div>
      </div>
    </>
  );
}
