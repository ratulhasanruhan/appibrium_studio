import { Topbar } from "@/components/topbar";
import { ProposalsList } from "@/modules/proposals/proposals-list";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Proposals" };

export default function ProposalsPage() {
  return (
    <>
      <Topbar
        title="Proposals"
        subtitle="Create, send and track client proposals"
        actions={
          <Link href="/proposals/new" id="new-proposal-btn" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>
            <Plus size={13} />
            New Proposal
          </Link>
        }
      />
      <div className="page-content">
        <ProposalsList />
      </div>
    </>
  );
}
