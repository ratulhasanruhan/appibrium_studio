import { Topbar } from "@/components/topbar";
import { LetterEditor } from "@/modules/letters/letter-editor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Document",
};

export default function NewLetterPage() {
  return (
    <>
      <Topbar title="New Document" subtitle="Compose an agreement, letter or certificate on company letterhead" />
      <div className="page-content">
        <LetterEditor />
      </div>
    </>
  );
}
