import { Topbar } from "@/components/topbar";
import { ProposalEditor } from "@/modules/proposals/proposal-editor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Proposal",
};

interface EditProposalPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProposalPage({ params }: EditProposalPageProps) {
  const { id } = await params;
  return (
    <>
      <Topbar title="Edit Proposal" subtitle={`Revise proposal reference: ${id}`} />
      <div className="page-content">
        <ProposalEditor id={id} />
      </div>
    </>
  );
}
