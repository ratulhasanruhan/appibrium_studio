"use client";

import React from "react";
import { Topbar } from "@/components/topbar";
import { InquiriesList } from "@/modules/inquiries/inquiries-list";

export default function InquiriesPage() {
  return (
    <>
      <Topbar
        title="Inquiry Requests"
        subtitle="Manage landing page project requests and client inquiries"
      />
      <div className="page-content">
        <InquiriesList />
      </div>
    </>
  );
}
