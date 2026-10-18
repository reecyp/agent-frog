import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { OnboardingForm } from "@/components/start/OnboardingForm";
import { currentStudent } from "@/server/profile";

export const metadata: Metadata = { title: "Your materials" };

export default function StartPage({ searchParams }: PageProps<"/start">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-xl gap-8">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      }
    >
      <Upload searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * A student who already uploaded continues where they left off; the upload form only returns when
 * they ask to replace their resume (?replace=1, from Profile and Settings).
 */
async function Upload({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [s, sp] = await Promise.all([currentStudent(), searchParams]);
  if (s && sp.replace !== "1") {
    if (s.onboardingStep === "questions") redirect("/start/questions");
    if (s.onboardingStep === "review") redirect("/start/confirm");
    redirect("/studio");
  }
  return <OnboardingForm replacing={Boolean(s)} />;
}
