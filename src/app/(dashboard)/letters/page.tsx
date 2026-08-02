import { Topbar } from "@/components/topbar";
import { LettersList } from "@/modules/letters/letters-list";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default function LettersPage() {
  return (
    <>
      <Topbar
        title="Documents"
        subtitle="Agreements, declarations, certificates and letters on company letterhead"
        actions={
          <Link href="/letters/new" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>
            <Plus size={13} /> New Document
          </Link>
        }
      />
      <div className="page-content">
        <LettersList />
      </div>
    </>
  );
}
