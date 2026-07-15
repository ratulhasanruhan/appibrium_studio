import { Topbar } from "@/components/topbar";
import { ProjectDetail } from "@/modules/projects/project-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Space · Appibrium Studio",
};

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return (
    <>
      <Topbar title="Project Workspace" subtitle="Monitor milestones, deliverables, and billing parameters" />
      <div className="page-content">
        <ProjectDetail id={id} />
      </div>
    </>
  );
}
