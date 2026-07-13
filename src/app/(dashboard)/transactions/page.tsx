import { Topbar } from "@/components/topbar";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Transactions" };
export default function TransactionsPage() {
  return (
    <>
      <Topbar title="Transactions" subtitle="Income, expenses, and ledger" />
      <div className="page-content">
        <div className="card" style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--foreground-muted)" }}>Transactions module — coming soon.</p>
        </div>
      </div>
    </>
  );
}
