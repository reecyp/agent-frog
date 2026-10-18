import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, ListSkeleton } from "@/components/ui";
import { SearchPanel } from "@/components/discover/SearchPanel";
import { PasteButton } from "@/components/discover/PastePosting";
import { Results } from "@/components/discover/Results";
import { BOARDS } from "@/server/jobs/companies";

export const metadata: Metadata = { title: "Discover jobs" };

export default function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  return (
    <>
      <PageHeader
        title="Discover jobs"
        lede={`Describe what you want. AGENT FROG reads ${BOARDS.length} employers' public job boards, opens each promising posting to confirm it's live, and explains how it fits your profile.`}
        actions={<PasteButton />}
      />
      <SearchPanel boardCount={BOARDS.length} />
      <Suspense fallback={<div className="mt-10"><ListSkeleton rows={3} /></div>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}
