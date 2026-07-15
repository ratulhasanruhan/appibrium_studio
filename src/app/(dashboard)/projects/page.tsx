import { Topbar } from "@/components/topbar";
import { ProjectsList } from "@/modules/projects/projects-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projects · Appibrium Studio" };

export default function ProjectsPage() {
  return (
    <>
      <Topbar
        title="Projects"
        subtitle="Manage client deliverables, milestones, and status"
      />
      <div className="page-content">
        <ProjectsList />
      </div>
    </>
  );
}
