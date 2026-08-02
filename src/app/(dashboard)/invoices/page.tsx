"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { InvoiceList } from "@/modules/invoices/invoice-list";
import { Plus } from "lucide-react";
import Link from "next/link";
import { account } from "@/lib/appwrite/client";
import { hasAdminRole } from "@/utils";

export default function InvoicesPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    account.get().then((user) => {
      const labels = (user as any).labels || [];
      const admin = hasAdminRole(labels);
      setIsAdmin(admin);
    }).catch(() => {
      setIsAdmin(false);
    });
  }, []);

  return (
    <>
      <Topbar
        title="Invoices"
        subtitle="Track billing, payments, and outstanding balances"
        actions={
          isAdmin ? (
            <Link href="/invoices/new" id="new-invoice-btn" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>
              <Plus size={13} />
              New Invoice
            </Link>
          ) : undefined
        }
      />
      <div className="page-content">
        <InvoiceList />
      </div>
    </>
  );
}
