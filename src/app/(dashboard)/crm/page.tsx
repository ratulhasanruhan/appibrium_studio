import { Topbar } from "@/components/topbar";
import { ClientsTable } from "@/modules/crm/clients-table";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "CRM · Clients" };

export default function CRMPage() {
  return (
    <>
      <Topbar
        title="CRM"
        subtitle="Manage leads, clients, and contacts"
        actions={
          <button id="add-client-btn" className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>
            <Plus size={13} />
            New Client
          </button>
        }
      />
      <div className="page-content">
        <ClientsTable />
      </div>
    </>
  );
}
