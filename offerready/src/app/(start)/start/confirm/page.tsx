import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentStudent, loadProfile } from "@/server/profile";
import { ListSkeleton, PageHeader } from "@/components/ui";
import { ProfileBody } from "@/components/profile/ProfileBody";
import { FinishOnboarding } from "@/components/start/FinishOnboarding";

export const metadata: Metadata = { title: "Check your profile" };

/** The last step of onboarding: the profile's own editors, framed as a check, ending at the studio. */
export default function ConfirmProfilePage() {
  return (
    <>
      <PageHeader
        title="Check your profile"
        lede="This is what was read from your materials. Correct anything that's wrong, add what's missing and remove what doesn't belong. Nothing here is invented: items marked for checking aren't used until you confirm them."
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Check />
      </Suspense>
    </>
  );
}

async function Check() {
  const s = await currentStudent();
  if (!s) redirect("/start");
  if (s.onboardingStep === "questions") redirect("/start/questions");
  if (s.onboardingStep === "done") redirect("/studio");
  const profile = await loadProfile(s.id);
  const unchecked =
    profile.experiences.filter((x) => x.status === "extracted").length +
    profile.experiences.reduce((n, x) => n + x.bullets.filter((b) => b.status === "extracted").length, 0) +
    profile.skills.filter((k) => k.status === "extracted").length;
  return (
    <>
      <ProfileBody studentId={s.id} />
      <FinishOnboarding unchecked={unchecked} />
    </>
  );
}
