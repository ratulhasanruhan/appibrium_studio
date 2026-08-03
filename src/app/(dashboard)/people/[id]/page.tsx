import { Topbar } from "@/components/topbar";
import { PersonDetail } from "@/modules/people/person-detail";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Team Member" };

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  return (
    <>
      <Topbar title="Team Member" subtitle="Engagements, payouts and outstanding balance" />
      <div className="page-content">
        <PersonDetail id={id} />
      </div>
    </>
  );
}
