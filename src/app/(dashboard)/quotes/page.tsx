"use client";

import React from "react";
import { Topbar } from "@/components/topbar";
import { QuotesList } from "@/modules/quotes/quotes-list";

export default function QuotesPage() {
  return (
    <>
      <Topbar
        title="Quote Requests"
        subtitle="Manage landing page project requests and client inquiries"
      />
      <div className="page-content">
        <QuotesList />
      </div>
    </>
  );
}
