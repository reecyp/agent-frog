import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FileUp } from "lucide-react";
import { activeStudentId } from "@/server/profile";
import { ListSkeleton, PageHeader, SectionTabs } from "@/components/ui";
import { ProfileBody } from "@/components/profile/ProfileBody";

export const metadata: Metadata = { title: "Career profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        tabs={<SectionTabs group="profile" current="/profile" />}
        title="Career profile"
        lede="Your evidence library. Every tailored line traces back to something here, so only keep what's true. Uploaded items stay marked until you confirm them."
        actions={<Link href="/start?replace=1" className="btn btn-secondary"><FileUp className="size-4" aria-hidden /> Upload a new resume</Link>}
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  return <ProfileBody studentId={await activeStudentId()} />;
}
