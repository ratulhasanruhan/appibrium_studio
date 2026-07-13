import { Topbar } from "@/components/topbar";
import { ClientDetail } from "@/modules/crm/client-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Workspace",
};

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  return (
    <>
      <Topbar title="Client Workspace" subtitle="Manage specific client relations, assets, and invoices" />
      <div className="page-content">
        <ClientDetail id={id} />
      </div>
    </>
  );
}
