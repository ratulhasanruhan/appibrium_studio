import { Topbar } from "@/components/topbar";
import { FilesList } from "@/modules/files/files-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Files · Appibrium Studio" };

export default function FilesPage() {
  return (
    <>
      <Topbar title="Files" subtitle="Manage contracts, project briefs, assets, and invoices" />
      <div className="page-content">
        <FilesList />
      </div>
    </>
  );
}
