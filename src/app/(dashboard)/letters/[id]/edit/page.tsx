import { Topbar } from "@/components/topbar";
import { LetterEditor } from "@/modules/letters/letter-editor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Document",
};

interface EditLetterPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLetterPage({ params }: EditLetterPageProps) {
  const { id } = await params;
  return (
    <>
      <Topbar title="Edit Document" subtitle="Revise this letterhead document" />
      <div className="page-content">
        <LetterEditor id={id} />
      </div>
    </>
  );
}
