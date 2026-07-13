import { Topbar } from "@/components/topbar";
import { ProposalEditor } from "@/modules/proposals/proposal-editor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Proposal",
};

export default function NewProposalPage() {
  return (
    <>
      <Topbar title="New Proposal" subtitle="Draft a new client contract or proposal" />
      <div className="page-content">
        <ProposalEditor />
      </div>
    </>
  );
}
