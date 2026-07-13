import { Topbar } from "@/components/topbar";
import { DashboardWidgets } from "@/modules/dashboard/dashboard-widgets";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" subtitle="Welcome back, Ratul" />
      <div className="page-content">
        <DashboardWidgets />
      </div>
    </>
  );
}
