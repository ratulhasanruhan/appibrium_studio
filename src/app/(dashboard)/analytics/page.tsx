import { Topbar } from "@/components/topbar";
import { AnalyticsDashboard } from "@/modules/analytics/analytics-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics · Appibrium Studio" };

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" subtitle="Business performance metrics and revenue tracking" />
      <div className="page-content">
        <AnalyticsDashboard />
      </div>
    </>
  );
}
