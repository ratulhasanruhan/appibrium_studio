import { Topbar } from "@/components/topbar";
import { LogsView } from "@/modules/logs/logs-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Logs · Appibrium Studio" };

export default function LogsPage() {
  return (
    <>
      <Topbar title="Logs" subtitle="Everything the system has done — activity, email and SMS" />
      <div className="page-content">
        <LogsView />
      </div>
    </>
  );
}
