"use client";

import React, { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { ProposalsList } from "@/modules/proposals/proposals-list";
import { Plus } from "lucide-react";
import Link from "next/link";
import { account } from "@/lib/appwrite/client";

export default function ProposalsPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    account.get().then((user) => {
      const labels = (user as any).labels || [];
      const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
      setIsAdmin(admin);
    }).catch(() => {
      setIsAdmin(false);
    });
  }, []);

  return (
    <>
      <Topbar
        title="Proposals"
        subtitle="Create, send and track client proposals"
        actions={
          isAdmin ? (
            <Link href="/proposals/new" id="new-proposal-btn" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12, textDecoration: "none" }}>
              <Plus size={13} />
              New Proposal
            </Link>
          ) : undefined
        }
      />
      <div className="page-content">
        <ProposalsList />
      </div>
    </>
  );
}
