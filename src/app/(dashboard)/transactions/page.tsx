import { Topbar } from "@/components/topbar";
import { TransactionsList } from "@/modules/transactions/transactions-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transactions · Appibrium Studio" };

export default function TransactionsPage() {
  return (
    <>
      <Topbar title="Transactions" subtitle="Track company ledger, project payments, and operating expenses" />
      <div className="page-content">
        <TransactionsList />
      </div>
    </>
  );
}
