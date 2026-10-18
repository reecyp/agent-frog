import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingForm } from "@/components/start/OnboardingForm";
import { currentStudent } from "@/server/profile";

export const metadata: Metadata = { title: "Your materials" };

export default function StartPage() {
  return (
    <Suspense fallback={<OnboardingForm replacing={false} />}>
      <Upload />
    </Suspense>
  );
}

async function Upload() {
  return <OnboardingForm replacing={Boolean(await currentStudent())} />;
}
