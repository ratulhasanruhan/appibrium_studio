import { Topbar } from "@/components/topbar";
import { InvoiceList } from "@/modules/invoices/invoice-list";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <>
      <Topbar
        title="Invoices"
        subtitle="Track billing, payments, and outstanding balances"
        actions={
          <Link href="/invoices/new" id="new-invoice-btn" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>
            <Plus size={13} />
            New Invoice
          </Link>
        }
      />
      <div className="page-content">
        <InvoiceList />
      </div>
    </>
  );
}
