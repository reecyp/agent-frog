import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Skeleton } from "@/components/ui";
import { QuestionsForm } from "@/components/start/QuestionsForm";
import { getDb, schema } from "@/server/db";
import { currentStudent } from "@/server/profile";

export const metadata: Metadata = { title: "A few questions" };

export default function OnboardingQuestionsPage() {
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
      <Questions />
    </Suspense>
  );
}

async function Questions() {
  const s = await currentStudent();
  if (!s) redirect("/start");
  if (s.onboardingStep === "done") redirect("/studio");
  if (s.onboardingStep === "review") redirect("/start/confirm");
  const db = await getDb();
  const [qs, exps] = await Promise.all([
    db.select().from(schema.profileAnswers).where(and(eq(schema.profileAnswers.studentId, s.id), eq(schema.profileAnswers.kind, "quiz"))).orderBy(asc(schema.profileAnswers.createdAt)),
    db.select({ id: schema.experiences.id, title: schema.experiences.title, organization: schema.experiences.organization }).from(schema.experiences).where(eq(schema.experiences.studentId, s.id)),
  ]);
  const context = (id: string | null) => {
    const x = exps.find((e) => e.id === id);
    return x ? `About ${x.title}, ${x.organization}` : null;
  };
  return <QuestionsForm questions={qs.map((q) => ({ id: q.id, question: q.question, answer: q.answer, context: context(q.experienceId) }))} />;
}
