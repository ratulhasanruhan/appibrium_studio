import { Topbar } from "@/components/topbar";
import { PeopleList } from "@/modules/people/people-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Team" };

export default function PeoplePage() {
  return (
    <>
      <Topbar title="Team" subtitle="Staff, contractors, engagements and payouts" />
      <div className="page-content">
        <PeopleList />
      </div>
    </>
  );
}
